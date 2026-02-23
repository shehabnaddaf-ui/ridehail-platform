/**
 * RideHail Backend - Entry point
 * Express API + Socket.io for real-time ride matching and tracking
 */

require('dotenv').config();
const http = require('http');
const app = require('./app');
const { initSocket } = require('./socket');
const { connectDb } = require('./db/client');
const { initializeFCM } = require('./services/fcm');

const PORT = process.env.PORT || 4000;

// Initialize FCM (if configured)
initializeFCM();

const server = http.createServer(app);

// Initialize Socket.io for real-time
initSocket(server);

async function start() {
  try {
    await connectDb();
    server.listen(PORT, () => {
      console.log(`RideHail API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
