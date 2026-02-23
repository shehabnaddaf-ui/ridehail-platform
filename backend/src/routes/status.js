/**
 * Status check routes for auto-refresh
 * Optimized for frequent polling (every 5 seconds)
 */

const express = require('express');
const { query } = require('../db/client');
const { authUser, authDriver } = require('../middleware/auth');

const router = express.Router();

// GET /api/status/user - Check user status (blocked, etc.)
router.get('/user', authUser, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, is_blocked, full_name, phone FROM users WHERE id = $1',
      [req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      status: {
        is_blocked: user.is_blocked,
        active: !user.is_blocked,
      },
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/status/driver - Check driver status (blocked, approval, etc.)
router.get('/driver', authDriver, async (req, res, next) => {
  try {
    const result = await query(
      'SELECT id, status, is_blocked, is_online, full_name, phone, rating FROM drivers WHERE id = $1',
      [req.driverId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    const driver = result.rows[0];
    
    res.json({
      success: true,
      status: {
        approval_status: driver.status, // pending, approved, rejected
        is_blocked: driver.is_blocked,
        is_online: driver.is_online,
        active: driver.status === 'approved' && !driver.is_blocked,
        can_go_online: driver.status === 'approved' && !driver.is_blocked,
      },
      driver: {
        id: driver.id,
        full_name: driver.full_name,
        phone: driver.phone,
        rating: parseFloat(driver.rating || 5.0),
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
