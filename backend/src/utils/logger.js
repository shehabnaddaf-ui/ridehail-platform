/**
 * Production-grade logging with Winston
 */

const winston = require('winston');
const path = require('path');

const logDir = process.env.LOG_DIR || 'logs';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'ridehail-api' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat,
    }),
  ],
});

// Add file transports only in non-serverless environments
// Vercel and other serverless platforms don't support file system writes
if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  try {
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    logger.add(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
    logger.add(
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 5,
      })
    );
  } catch (error) {
    // Silently fail if file logging is not available
    console.warn('File logging not available in serverless environment');
  }
}

// Create a stream for Morgan
logger.stream = {
  write: (message) => logger.info(message.trim()),
};

module.exports = logger;
