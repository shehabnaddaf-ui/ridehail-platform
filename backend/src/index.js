/**
 * RideHail Backend - Entry point
 * Serverless-compatible for Vercel
 */

require('dotenv').config();
const app = require('./app');
const { connectDb } = require('./db/client');
const { initializeFCM } = require('./services/fcm');

// Initialize FCM (if configured)
initializeFCM();

// Connect to database on cold start
connectDb().catch(err => {
  console.error('Database connection failed:', err);
});

// Export for Vercel serverless
module.exports = app;
