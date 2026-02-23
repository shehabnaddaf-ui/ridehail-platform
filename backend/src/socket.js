/**
 * Socket.io - Real-time: driver location, ride requests, trip status
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { query } = require('./db/client');

// Require JWT_SECRET - no fallback
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

const JWT_SECRET = process.env.JWT_SECRET;

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: { origin: process.env.CORS_ORIGIN || '*', credentials: true },
    path: '/socket.io',
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) return next(new Error('Auth required'));
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.type = decoded.type;
      socket.userId = decoded.userId || null;
      socket.driverId = decoded.driverId || null;
      socket.adminId = decoded.adminId || null;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userType = socket.type;
    const userId = socket.userId;
    const driverId = socket.driverId;
    
    if (userType === 'user' && userId) {
      socket.join(`user:${userId}`);
      logger.info('User connected', { userId, socketId: socket.id });
    }
    
    if (userType === 'driver' && driverId) {
      socket.join(`driver:${driverId}`);
      logger.info('Driver connected', { driverId, socketId: socket.id });
      
      // Mark driver as online when they connect
      query('UPDATE drivers SET is_online = TRUE, last_location_at = NOW() WHERE id = $1', [driverId])
        .catch((err) => logger.error('Failed to update driver online status', { error: err.message }));
    }
    
    if (userType === 'admin') {
      socket.join('admin');
      logger.info('Admin connected', { socketId: socket.id });
    }

    // Driver sends location updates
    socket.on('driver_location', async (data) => {
      if (driverId && data.lat != null && data.lng != null) {
        try {
          await query(
            'UPDATE drivers SET current_lat = $1, current_lng = $2, last_location_at = NOW() WHERE id = $3',
            [data.lat, data.lng, driverId]
          );
          
          // Send location to rider if driver is on active trip
          const tripRes = await query(
            'SELECT rider_id FROM trips WHERE driver_id = $1 AND status IN ($2, $3) ORDER BY requested_at DESC LIMIT 1',
            [driverId, 'accepted', 'in_progress']
          );
          
          if (tripRes.rows.length > 0) {
            io.to(`user:${tripRes.rows[0].rider_id}`).emit('driver_location', { 
              lat: data.lat, 
              lng: data.lng,
              timestamp: new Date().toISOString(),
            });
          }
        } catch (err) {
          logger.error('Failed to update driver location', { error: err.message, driverId });
        }
      }
    });

    socket.on('disconnect', async () => {
      if (userType === 'user' && userId) {
        logger.info('User disconnected', { userId, socketId: socket.id });
      }
      
      if (userType === 'driver' && driverId) {
        logger.info('Driver disconnected', { driverId, socketId: socket.id });
        
        // Check if driver has any active trips before marking offline
        try {
          const activeTrip = await query(
            'SELECT id FROM trips WHERE driver_id = $1 AND status IN ($2, $3, $4) LIMIT 1',
            [driverId, 'accepted', 'driver_arriving', 'in_progress']
          );
          
          // Only mark offline if no active trips
          if (activeTrip.rows.length === 0) {
            await query('UPDATE drivers SET is_online = FALSE WHERE id = $1', [driverId]);
            logger.info('Driver marked offline', { driverId });
          }
        } catch (err) {
          logger.error('Failed to update driver offline status', { error: err.message, driverId });
        }
      }
      
      if (userType === 'admin') {
        logger.info('Admin disconnected', { socketId: socket.id });
      }
    });
  });

  return io;
}

function getIo() {
  return io;
}

module.exports = { initSocket, getIo };
