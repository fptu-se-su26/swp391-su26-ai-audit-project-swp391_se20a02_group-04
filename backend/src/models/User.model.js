const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  phone: {
    type: String,
    sparse: true, // Allow null for Google OAuth users
    trim: true,
    match: [/^[0-9]{10,11}$/, 'Please provide a valid phone number']
  },
  password_hash: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't return password by default
  },
  full_name: {
    type: String,
    trim: true,
    required: [true, 'Full name is required']
  },
  avatar_url: {
    type: String,
    trim: true
  },
  auth_provider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  },
  google_id: {
    type: String,
    sparse: true,
    unique: true
  },
  verified: {
    type: Boolean,
    default: false
  },
  email_verified_at: {
    type: Date
  },
  verification_token: {
    type: String,
    select: false
  },
  verification_token_expires: {
    type: Date,
    select: false
  },
  verification_otp: {
    type: String,
    select: false
  },
  verification_otp_expires: {
    type: Date,
    select: false
  },
  reset_password_token: {
    type: String,
    select: false
  },
  reset_password_expires: {
    type: Date,
    select: false
  },
  failed_login_attempts: {
    type: Number,
    default: 0
  },
  account_locked_until: {
    type: Date
  },
  last_login: {
    type: Date
  },
  last_password_change: {
    type: Date
  },
  is_active: {
    type: Boolean,
    default: true
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password_hash')) {
    return next();
  }

  try {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    this.password_hash = await bcrypt.hash(this.password_hash, rounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password_hash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Method to get user without sensitive data
userSchema.methods.toSafeObject = function() {
  const user = this.toObject();
  delete user.password_hash;
  delete user.verification_token;
  delete user.verification_token_expires;
  delete user.reset_password_token;
  delete user.reset_password_expires;
  delete user.google_id;
  delete user.failed_login_attempts;
  delete user.account_locked_until;
  delete user.__v;
  return user;
};

// Method to generate email verification OTP (6 digits)
userSchema.methods.generateVerificationOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  this.verification_otp = otp;
  this.verification_otp_expires = Date.now() + (parseInt(process.env.OTP_EXPIRE) || 10) * 60 * 1000; // 10 minutes default
  return otp;
};

// Method to generate email verification token
userSchema.methods.generateVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.verification_token = crypto.createHash('sha256').update(token).digest('hex');
  this.verification_token_expires = Date.now() + (parseInt(process.env.EMAIL_VERIFICATION_EXPIRE) || 1440) * 60 * 1000; // 24 hours default
  return token;
};

// Method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.reset_password_token = crypto.createHash('sha256').update(token).digest('hex');
  this.reset_password_expires = Date.now() + (parseInt(process.env.PASSWORD_RESET_EXPIRE) || 60) * 60 * 1000; // 1 hour default
  return token;
};

// Method to check if account is locked
userSchema.methods.isAccountLocked = function() {
  return this.account_locked_until && this.account_locked_until > Date.now();
};

// Method to increment failed login attempts
userSchema.methods.incrementFailedAttempts = async function() {
  this.failed_login_attempts += 1;
  
  // Lock account after 5 failed attempts for 30 minutes
  if (this.failed_login_attempts >= 5) {
    this.account_locked_until = Date.now() + 30 * 60 * 1000; // 30 minutes
  }
  
  await this.save();
};

// Method to reset failed login attempts
userSchema.methods.resetFailedAttempts = async function() {
  this.failed_login_attempts = 0;
  this.account_locked_until = undefined;
  await this.save();
};

const User = mongoose.model('User', userSchema, 'users');

module.exports = User;
