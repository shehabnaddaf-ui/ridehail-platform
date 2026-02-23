/**
 * Global error handler with proper logging
 */

const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  // Log error with context
  logger.error('Request error', {
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.userId || req.driverId || req.adminId,
  });

  // Determine status code
  const status = err.statusCode || err.status || 500;
  
  // Don't expose internal errors in production
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal Server Error';

  // Send error response
  res.status(status).json({ 
    success: false, 
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
