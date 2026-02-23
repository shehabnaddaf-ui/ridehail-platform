/**
 * Simple console logger for serverless environments
 */

// Simple logger that works in all environments
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => console.log('[DEBUG]', ...args),
  
  // Stream for Morgan
  stream: {
    write: (message) => console.log('[HTTP]', message.trim()),
  },
};

module.exports = logger;
