const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';

/**
 * General API rate limiter
 * Dev: cao hơn để hỗ trợ polling (notifications/chat/dashboard)
 * Prod: giữ chặt để chống spam
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || (isDev ? 5000 : 100),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => {
    // Skip in test; optionally disable entirely in local development
    if (process.env.NODE_ENV === 'test') return true;
    if (isDev && process.env.RATE_LIMIT_DISABLED === 'true') return true;
    return false;
  }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 50 : 5,
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for password reset
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 20 : 3,
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate limiter for email verification
 */
const emailVerificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 20 : 5,
  message: {
    success: false,
    message: 'Too many verification email requests, please try again after 1 hour.',
    retryAfter: '1 hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  emailVerificationLimiter
};
