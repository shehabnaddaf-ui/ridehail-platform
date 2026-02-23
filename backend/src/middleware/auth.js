/**
 * JWT authentication and role-based access
 */

const jwt = require('jsonwebtoken');
const { query } = require('../db/client');

// Require JWT_SECRET in production - no fallback
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;

async function authUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = await query('SELECT id, phone, full_name, email, role, is_blocked FROM users WHERE id = $1', [decoded.userId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Check if user is blocked
    if (user.is_blocked) {
      return res.status(403).json({ 
        success: false, 
        error: 'Your account has been blocked. Please contact support.',
        blocked: true,
      });
    }
    
    req.user = user;
    req.userId = user.id;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, error: 'Invalid token' });
    if (err.name === 'TokenExpiredError') return res.status(401).json({ success: false, error: 'Token expired' });
    next(err);
  }
}

async function authDriver(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'driver') {
      return res.status(403).json({ success: false, error: 'Driver access required' });
    }
    const result = await query(
      'SELECT id, user_id, phone, full_name, status, is_online, is_blocked, rating FROM drivers WHERE id = $1',
      [decoded.driverId]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Driver not found' });
    }
    
    const driver = result.rows[0];
    
    // Check if driver is blocked
    if (driver.is_blocked) {
      return res.status(403).json({ 
        success: false, 
        error: 'Your account has been blocked. Please contact support.',
        blocked: true,
      });
    }
    
    // Check if driver is approved
    if (driver.status === 'pending') {
      return res.status(403).json({ 
        success: false, 
        error: 'Your application is pending approval. You will be notified within 24 hours.',
        status: 'pending',
      });
    }
    
    if (driver.status === 'rejected') {
      return res.status(403).json({ 
        success: false, 
        error: 'Your application has been rejected. Please contact support for more information.',
        status: 'rejected',
      });
    }
    
    req.driver = driver;
    req.driverId = driver.id;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, error: 'Invalid token' });
    next(err);
  }
}

async function authAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Token required' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const result = await query('SELECT id, email, full_name FROM admins WHERE id = $1', [decoded.adminId]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, error: 'Admin not found' });
    }
    req.admin = result.rows[0];
    req.adminId = req.admin.id;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ success: false, error: 'Invalid token' });
    next(err);
  }
}

function signUserToken(userId) {
  return jwt.sign({ userId, type: 'user' }, JWT_SECRET, { expiresIn: '7d' });
}

function signDriverToken(driverId) {
  return jwt.sign({ driverId, type: 'driver' }, JWT_SECRET, { expiresIn: '7d' });
}

function signAdminToken(adminId) {
  return jwt.sign({ adminId, type: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

module.exports = {
  authUser,
  authDriver,
  authAdmin,
  signUserToken,
  signDriverToken,
  signAdminToken,
  JWT_SECRET,
};
