/**
 * PostgreSQL connection pool - Serverless optimized
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10, // Lower for serverless
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[DB ERROR]', err.message);
});

async function connectDb() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('[DB] Connection verified');
    return true;
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    throw err;
  }
}

async function query(text, params) {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    console.error('[DB] Query error:', err.message);
    throw err;
  }
}

async function withTransaction(callback) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Transaction rolled back:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

async function closePool() {
  try {
    await pool.end();
    console.log('[DB] Pool closed');
  } catch (err) {
    console.error('[DB] Error closing pool:', err.message);
  }
}

module.exports = { pool, query, connectDb, withTransaction, closePool };
