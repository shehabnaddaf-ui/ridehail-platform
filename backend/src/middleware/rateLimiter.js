/**
 * Rate limiting middleware to prevent abuse
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
    });
  },
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  message: { success: false, error: 'Too many authentication attempts, please try again later' },
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
    });
  },
});

// OTP rate limiter - very strict
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 OTP requests per hour
  message: { success: false, error: 'Too many OTP requests, please try again in an hour' },
  handler: (req, res) => {
    logger.warn('OTP rate limit exceeded', { ip: req.ip, phone: req.body.phone });
    res.status(429).json({
      success: false,
      error: 'Too many OTP requests, please try again in an hour',
    });
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  otpLimiter,
};
