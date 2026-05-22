const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { 
  registerValidation,
  loginValidation,
  googleAuthValidation,
  verifyEmailValidation,
  resendVerificationValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  validate 
} = require('../middleware/validator.middleware');
const {
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
} = require('../middleware/rateLimiter.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register new user with email verification
 * @access  Public
 */
router.post('/register', authLimiter, registerValidation, validate, authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user with credentials
 * @access  Public
 */
router.post('/login', authLimiter, loginValidation, validate, authController.login);

/**
 * @route   POST /api/auth/google
 * @desc    Login/Register with Google OAuth
 * @access  Public
 */
router.post('/google', authLimiter, googleAuthValidation, validate, authController.googleAuth);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify email with OTP code
 * @access  Public
 */
router.post('/verify-otp', emailVerificationLimiter, authController.verifyOTP);

/**
 * @route   POST /api/auth/resend-otp
 * @desc    Resend OTP verification code
 * @access  Public
 */
router.post('/resend-otp', emailVerificationLimiter, authController.resendOTP);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address (old method - kept for backward compatibility)
 * @access  Public
 */
router.get('/verify-email/:token', verifyEmailValidation, validate, authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post('/resend-verification', emailVerificationLimiter, resendVerificationValidation, validate, authController.resendVerification);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidation, validate, authController.forgotPassword);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', resetPasswordValidation, validate, authController.resetPassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, authController.getMe);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', refreshTokenValidation, validate, authController.refreshToken);

module.exports = router;
