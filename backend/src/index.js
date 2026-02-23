/**
 * RideHail Backend - Entry point
 * Serverless-compatible for Vercel
 */

require('dotenv').config();
const app = require('./app');

// Export for Vercel serverless
module.exports = app;
