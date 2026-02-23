/**
 * PostgreSQL connection pool with error handling and reconnection
 */

const { Pool } = require('pg');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Reconnection settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error', { error: err.message });
});

// Handle connection errors
pool.on('connect', () => {
  logger.info('New database connection established');
});

async function connectDb() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    logger.info('Database connection verified');
    return true;
  } catch (err) {
    logger.error('Database connection failed', { error: err.message });
    throw err;
  }
}

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    // Log slow queries
    if (duration > 100) {
      logger.warn('Slow query detected', { 
        query: text.substring(0, 100), 
        duration,
        params: params ? params.length : 0,
      });
    }
    
    return res;
  } catch (err) {
    logger.error('Query error', { 
      error: err.message, 
      query: text.substring(0, 100),
    });
    throw err;
  }
}

/**
 * Execute queries within a transaction
 * Usage:
 *   await withTransaction(async (client) => {
 *     await client.query('INSERT ...');
 *     await client.query('UPDATE ...');
 *   });
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Transaction rolled back', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Graceful shutdown
 */
async function closePool() {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (err) {
    logger.error('Error closing database pool', { error: err.message });
  }
}

// Handle process termination
process.on('SIGTERM', closePool);
process.on('SIGINT', closePool);

module.exports = { pool, query, connectDb, withTransaction, closePool };
