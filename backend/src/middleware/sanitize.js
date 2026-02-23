/**
 * Input sanitization middleware
 */

const mongoSanitize = require('express-mongo-sanitize');

// Sanitize user input to prevent NoSQL injection
const sanitizeInput = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    const logger = require('../utils/logger');
    logger.warn('Sanitized malicious input', { ip: req.ip, key });
  },
});

// Additional XSS protection
function sanitizeStrings(req, res, next) {
  const sanitizeValue = (value) => {
    if (typeof value === 'string') {
      // Remove potential XSS patterns
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
    return value;
  };

  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'string') {
          obj[key] = sanitizeValue(obj[key]);
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      });
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
}

module.exports = {
  sanitizeInput,
  sanitizeStrings,
};
