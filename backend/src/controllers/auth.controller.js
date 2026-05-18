const crypto = require('crypto');
const User = require('../models/User.model');
const UserRole = require('../models/UserRole.model');
const Role = require('../models/Role.model');
const UserAudit = require('../models/UserAudit.model');
const { generateAccessToken, generateRefreshToken } = require('../utils/jwt.util');
const { successResponse, errorResponse } = require('../utils/response.util');
const { verifyGoogleToken } = require('../utils/googleAuth.util');
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendWelcomeEmail 
} = require('../utils/email.util');

/**
 * Register new user with email verification
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    const { email, phone, password, full_name } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return errorResponse(res, 409, 'Email already registered');
      }
      if (existingUser.phone === phone) {
        return errorResponse(res, 409, 'Phone number already registered');
      }
    }

    // Create new user
    const user = new User({
      email,
      phone,
      password_hash: password, // Will be hashed by pre-save hook
      full_name,
      verified: false,
      auth_provider: 'local'
    });

    // Generate verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Assign default CUSTOMER role
    const customerRole = await Role.findOne({ role_name: 'CUSTOMER' });
    
    if (customerRole) {
      await UserRole.create({
        user_id: user._id,
        role_id: customerRole._id
      });
    }

    // Send verification email
    try {
      await sendVerificationEmail(email, full_name, verificationToken);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue registration even if email fails
    }

    // Log audit
    await UserAudit.create({
      user_id: user._id,
      action: 'REGISTER',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { auth_provider: 'local' }
    });

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user._id });
    const refreshToken = generateRefreshToken({ userId: user._id });

    return successResponse(res, 201, 'Registration successful. Please check your email to verify your account.', {
      user: user.toSafeObject(),
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 500, 'Registration failed');
  }
};

/**
 * Login user with account lockout protection
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { phone: identifier }
      ]
    }).select('+password_hash');

    if (!user) {
      // Log failed attempt
      await UserAudit.create({
        user_id: null,
        action: 'LOGIN',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'FAILED',
        error_message: 'User not found',
        metadata: { identifier }
      });

      return errorResponse(res, 401, 'Invalid credentials');
    }

    // Check if account is locked
    if (user.isAccountLocked()) {
      const lockTimeRemaining = Math.ceil((user.account_locked_until - Date.now()) / 60000);
      return errorResponse(res, 423, `Account is locked due to multiple failed login attempts. Please try again in ${lockTimeRemaining} minutes.`);
    }

    // Check if account is active
    if (!user.is_active) {
      return errorResponse(res, 403, 'Account is deactivated. Please contact support.');
    }

    // Check if user registered with Google
    if (user.auth_provider === 'google' && !user.password_hash) {
      return errorResponse(res, 400, 'This account was created with Google. Please use Google Sign-In.');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      // Increment failed attempts
      await user.incrementFailedAttempts();

      // Log failed attempt
      await UserAudit.create({
        user_id: user._id,
        action: 'LOGIN',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'FAILED',
        error_message: 'Invalid password',
        metadata: { 
          failed_attempts: user.failed_login_attempts,
          locked: user.isAccountLocked()
        }
      });

      const remainingAttempts = 5 - user.failed_login_attempts;
      if (remainingAttempts > 0) {
        return errorResponse(res, 401, `Invalid credentials. ${remainingAttempts} attempts remaining before account lockout.`);
      } else {
        return errorResponse(res, 423, 'Account locked due to multiple failed login attempts. Please try again in 30 minutes.');
      }
    }

    // Reset failed attempts on successful login
    await user.resetFailedAttempts();

    // Update last login
    user.last_login = new Date();
    await user.save();

    // Get user roles
    const userRoles = await UserRole.find({ user_id: user._id })
      .populate('role_id', 'role_name');
    
    const roles = userRoles.map(ur => ur.role_id.role_name);

    // Generate tokens
    const accessToken = generateAccessToken({ 
      userId: user._id,
      roles 
    });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Log successful login
    await UserAudit.create({
      user_id: user._id,
      action: 'LOGIN',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    return successResponse(res, 200, 'Login successful', {
      user: user.toSafeObject(),
      roles,
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 500, 'Login failed');
  }
};

/**
 * Google OAuth login/register
 * POST /api/auth/google
 */
const googleAuth = async (req, res) => {
  try {
    const { id_token } = req.body;

    // Verify Google token
    const googleUser = await verifyGoogleToken(id_token);

    // Find or create user
    let user = await User.findOne({ 
      $or: [
        { google_id: googleUser.google_id },
        { email: googleUser.email }
      ]
    });

    let isNewUser = false;

    if (!user) {
      // Create new user
      user = new User({
        email: googleUser.email,
        full_name: googleUser.full_name,
        avatar_url: googleUser.avatar_url,
        google_id: googleUser.google_id,
        auth_provider: 'google',
        verified: googleUser.email_verified,
        email_verified_at: googleUser.email_verified ? new Date() : null
      });

      await user.save();
      isNewUser = true;

      // Assign default CUSTOMER role
      const customerRole = await Role.findOne({ role_name: 'CUSTOMER' });
      
      if (customerRole) {
        await UserRole.create({
          user_id: user._id,
          role_id: customerRole._id
        });
      }

      // Send welcome email if verified
      if (googleUser.email_verified) {
        try {
          await sendWelcomeEmail(user.email, user.full_name);
        } catch (emailError) {
          console.error('Failed to send welcome email:', emailError);
        }
      }

      // Log registration
      await UserAudit.create({
        user_id: user._id,
        action: 'REGISTER',
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        status: 'SUCCESS',
        metadata: { auth_provider: 'google' }
      });

    } else {
      // Update existing user
      if (!user.google_id) {
        user.google_id = googleUser.google_id;
      }
      if (!user.avatar_url && googleUser.avatar_url) {
        user.avatar_url = googleUser.avatar_url;
      }
      if (!user.verified && googleUser.email_verified) {
        user.verified = true;
        user.email_verified_at = new Date();
      }
      
      user.last_login = new Date();
      await user.save();
    }

    // Check if account is active
    if (!user.is_active) {
      return errorResponse(res, 403, 'Account is deactivated. Please contact support.');
    }

    // Get user roles
    const userRoles = await UserRole.find({ user_id: user._id })
      .populate('role_id', 'role_name');
    
    const roles = userRoles.map(ur => ur.role_id.role_name);

    // Generate tokens
    const accessToken = generateAccessToken({ 
      userId: user._id,
      roles 
    });
    const refreshToken = generateRefreshToken({ userId: user._id });

    // Log login
    await UserAudit.create({
      user_id: user._id,
      action: 'LOGIN',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { auth_provider: 'google' }
    });

    return successResponse(res, 200, isNewUser ? 'Account created successfully with Google' : 'Login successful', {
      user: user.toSafeObject(),
      roles,
      isNewUser,
      tokens: {
        accessToken,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Google auth error:', error);
    
    // Log failed attempt
    await UserAudit.create({
      user_id: null,
      action: 'LOGIN',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'FAILED',
      error_message: error.message,
      metadata: { auth_provider: 'google' }
    });

    return errorResponse(res, 401, 'Google authentication failed');
  }
};

/**
 * Verify email
 * GET /api/auth/verify-email/:token
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      verification_token: hashedToken,
      verification_token_expires: { $gt: Date.now() }
    }).select('+verification_token +verification_token_expires');

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired verification token');
    }

    if (user.verified) {
      return errorResponse(res, 400, 'Email already verified');
    }

    // Verify user
    user.verified = true;
    user.email_verified_at = new Date();
    user.verification_token = undefined;
    user.verification_token_expires = undefined;
    await user.save();

    // Send welcome email
    try {
      await sendWelcomeEmail(user.email, user.full_name);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Log verification
    await UserAudit.create({
      user_id: user._id,
      action: 'EMAIL_VERIFY',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    return successResponse(res, 200, 'Email verified successfully', {
      user: user.toSafeObject()
    });

  } catch (error) {
    console.error('Verify email error:', error);
    return errorResponse(res, 500, 'Email verification failed');
  }
};

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    if (user.verified) {
      return errorResponse(res, 400, 'Email already verified');
    }

    // Generate new verification token
    const verificationToken = user.generateVerificationToken();
    await user.save();

    // Send verification email
    await sendVerificationEmail(email, user.full_name, verificationToken);

    return successResponse(res, 200, 'Verification email sent successfully');

  } catch (error) {
    console.error('Resend verification error:', error);
    return errorResponse(res, 500, 'Failed to send verification email');
  }
};

/**
 * Forgot password - send reset email
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists
      return successResponse(res, 200, 'If an account exists with this email, a password reset link has been sent.');
    }

    if (user.auth_provider === 'google' && !user.password_hash) {
      return errorResponse(res, 400, 'This account was created with Google. Please use Google Sign-In.');
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(email, user.full_name, resetToken);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      return errorResponse(res, 500, 'Failed to send password reset email');
    }

    // Log password reset request
    await UserAudit.create({
      user_id: user._id,
      action: 'PASSWORD_RESET',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { action: 'reset_requested' }
    });

    return successResponse(res, 200, 'Password reset link has been sent to your email');

  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponse(res, 500, 'Failed to process password reset request');
  }
};

/**
 * Reset password with token
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body;

    // Hash the token to compare with database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: Date.now() }
    }).select('+reset_password_token +reset_password_expires +password_hash');

    if (!user) {
      return errorResponse(res, 400, 'Invalid or expired reset token');
    }

    // Check if new password is same as old password
    if (user.password_hash) {
      const isSamePassword = await user.comparePassword(new_password);
      if (isSamePassword) {
        return errorResponse(res, 400, 'New password must be different from your current password');
      }
    }

    // Update password
    user.password_hash = new_password; // Will be hashed by pre-save hook
    user.reset_password_token = undefined;
    user.reset_password_expires = undefined;
    user.last_password_change = new Date();
    user.failed_login_attempts = 0;
    user.account_locked_until = undefined;
    await user.save();

    // Log password reset
    await UserAudit.create({
      user_id: user._id,
      action: 'PASSWORD_RESET',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS',
      metadata: { action: 'password_changed' }
    });

    return successResponse(res, 200, 'Password reset successfully. You can now login with your new password.');

  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponse(res, 500, 'Failed to reset password');
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    // Log logout
    await UserAudit.create({
      user_id: req.user.userId,
      action: 'LOGOUT',
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      status: 'SUCCESS'
    });

    return successResponse(res, 200, 'Logout successful');
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 500, 'Logout failed');
  }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);

    if (!user) {
      return errorResponse(res, 404, 'User not found');
    }

    // Get user roles
    const userRoles = await UserRole.find({ user_id: user._id })
      .populate('role_id', 'role_name description');

    return successResponse(res, 200, 'User profile retrieved', {
      user: user.toSafeObject(),
      roles: userRoles.map(ur => ({
        name: ur.role_id.role_name,
        description: ur.role_id.description
      }))
    });

  } catch (error) {
    console.error('Get me error:', error);
    return errorResponse(res, 500, 'Failed to retrieve profile');
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return errorResponse(res, 400, 'Refresh token is required');
    }

    // Verify refresh token
    const { verifyToken } = require('../utils/jwt.util');
    const decoded = verifyToken(refreshToken);

    // Check if user exists
    const user = await User.findById(decoded.userId);

    if (!user || !user.is_active) {
      return errorResponse(res, 401, 'Invalid refresh token');
    }

    // Get user roles
    const userRoles = await UserRole.find({ user_id: user._id })
      .populate('role_id', 'role_name');
    
    const roles = userRoles.map(ur => ur.role_id.role_name);

    // Generate new access token
    const newAccessToken = generateAccessToken({ 
      userId: user._id,
      roles 
    });

    return successResponse(res, 200, 'Token refreshed', {
      accessToken: newAccessToken
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    return errorResponse(res, 401, 'Invalid or expired refresh token');
  }
};

module.exports = {
  register,
  login,
  googleAuth,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  refreshToken
};
