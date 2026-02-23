/**
 * Admin: users, drivers, trips, fare config, commission, reports
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const bcrypt = require('bcryptjs');
const { authAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const router = express.Router();

// Seed first admin (no auth - call only once when no admins exist)
router.post('/seed', async (req, res, next) => {
  try {
    const existing = await query('SELECT id FROM admins LIMIT 1');
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'Admin already exists' });
    }
    
    const email = req.body.email || 'admin@ridehail.com';
    const password = req.body.password;
    
    // Validate password
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }
    
    const { validatePassword } = require('../utils/validation');
    const passwordValidation = validatePassword(password);
    
    if (!passwordValidation.valid) {
      return res.status(400).json({ success: false, error: passwordValidation.error });
    }
    
    const hash = await bcrypt.hash(password, 12); // Increased from 10 to 12 rounds
    const id = uuidv4();
    
    await query('INSERT INTO admins (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4)', [id, email, hash, 'Admin']);
    
    logger.info('Admin account created', { adminId: id, email });
    res.status(201).json({ success: true, message: 'Admin created', email });
  } catch (err) {
    next(err);
  }
});

router.use(authAdmin);

// ---------- Drivers ----------
// GET /api/admin/drivers
router.get('/drivers', async (req, res, next) => {
  try {
    const status = req.query.status;
    let q = 'SELECT d.*, w.balance FROM drivers d LEFT JOIN wallets w ON w.driver_id = d.id WHERE 1=1';
    const params = [];
    if (status) { params.push(status); q += ` AND d.status = $${params.length}`; }
    q += ' ORDER BY d.created_at DESC';
    const r = await query(q, params);
    res.json({ success: true, drivers: r.rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/drivers/:id/approve
router.patch('/drivers/:id/approve', async (req, res, next) => {
  try {
    await query("UPDATE drivers SET status = 'approved', updated_at = NOW() WHERE id = $1", [req.params.id]);
    const r = await query('SELECT id, full_name, status FROM drivers WHERE id = $1', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Driver not found' });
    res.json({ success: true, driver: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/drivers/:id/reject
router.patch('/drivers/:id/reject', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    await query(
      "UPDATE drivers SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2",
      [reason || 'Application rejected', req.params.id]
    );
    
    logger.info('Driver rejected', { driverId: req.params.id, adminId: req.adminId, reason });
    res.json({ success: true, message: 'Driver application rejected' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/drivers/:id/block - Block driver
router.patch('/drivers/:id/block', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    await query(
      'UPDATE drivers SET is_blocked = TRUE, is_online = FALSE, blocked_at = NOW(), blocked_by = $1, block_reason = $2, updated_at = NOW() WHERE id = $3',
      [req.adminId, reason || 'Blocked by admin', req.params.id]
    );
    
    const r = await query('SELECT id, phone, full_name, is_blocked, status FROM drivers WHERE id = $1', [req.params.id]);
    
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    logger.info('Driver blocked', { driverId: req.params.id, adminId: req.adminId, reason });
    res.json({ success: true, driver: r.rows[0], message: 'Driver blocked successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/drivers/:id/unblock - Unblock driver
router.patch('/drivers/:id/unblock', async (req, res, next) => {
  try {
    await query(
      'UPDATE drivers SET is_blocked = FALSE, blocked_at = NULL, blocked_by = NULL, block_reason = NULL, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );
    
    const r = await query('SELECT id, phone, full_name, is_blocked, status FROM drivers WHERE id = $1', [req.params.id]);
    
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Driver not found' });
    }
    
    logger.info('Driver unblocked', { driverId: req.params.id, adminId: req.adminId });
    res.json({ success: true, driver: r.rows[0], message: 'Driver unblocked successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/drivers/:id
router.patch('/drivers/:id', async (req, res, next) => {
  try {
    const { fuel_consumption_tanaka_km } = req.body;
    if (fuel_consumption_tanaka_km !== undefined) {
      await query('UPDATE drivers SET fuel_consumption_tanaka_km = $1, updated_at = NOW() WHERE id = $2', [fuel_consumption_tanaka_km, req.params.id]);
    }
    const r = await query('SELECT * FROM drivers WHERE id = $1', [req.params.id]);
    res.json({ success: true, driver: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------- Users ----------
// GET /api/admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { parsePagination, paginatedResponse } = require('../utils/pagination');
    const { page, limit, offset } = parsePagination(req.query);
    
    const countQuery = "SELECT COUNT(*) FROM users WHERE role = 'rider'";
    const dataQuery = `SELECT id, phone, full_name, email, is_blocked, created_at, 
                       (SELECT COUNT(*) FROM trips WHERE rider_id = users.id AND status = 'completed') AS total_trips
                       FROM users WHERE role = 'rider' 
                       ORDER BY created_at DESC 
                       LIMIT $1 OFFSET $2`;
    
    const [countResult, dataResult] = await Promise.all([
      query(countQuery),
      query(dataQuery, [limit, offset]),
    ]);
    
    const total = parseInt(countResult.rows[0].count, 10);
    res.json(paginatedResponse(dataResult.rows, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/block - Block user
router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const { reason } = req.body;
    
    await query(
      'UPDATE users SET is_blocked = TRUE, blocked_at = NOW(), blocked_by = $1, block_reason = $2, updated_at = NOW() WHERE id = $3',
      [req.adminId, reason || 'Blocked by admin', req.params.id]
    );
    
    const r = await query('SELECT id, phone, full_name, is_blocked FROM users WHERE id = $1', [req.params.id]);
    
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    logger.info('User blocked', { userId: req.params.id, adminId: req.adminId, reason });
    res.json({ success: true, user: r.rows[0], message: 'User blocked successfully' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/unblock - Unblock user
router.patch('/users/:id/unblock', async (req, res, next) => {
  try {
    await query(
      'UPDATE users SET is_blocked = FALSE, blocked_at = NULL, blocked_by = NULL, block_reason = NULL, updated_at = NOW() WHERE id = $1',
      [req.params.id]
    );
    
    const r = await query('SELECT id, phone, full_name, is_blocked FROM users WHERE id = $1', [req.params.id]);
    
    if (r.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    logger.info('User unblocked', { userId: req.params.id, adminId: req.adminId });
    res.json({ success: true, user: r.rows[0], message: 'User unblocked successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/trips
router.get('/trips', async (req, res, next) => {
  try {
    const { parsePagination, paginatedResponse } = require('../utils/pagination');
    const { page, limit, offset } = parsePagination(req.query);
    
    const countQuery = 'SELECT COUNT(*) FROM trips';
    const dataQuery = `SELECT t.*, u.full_name AS rider_name, d.full_name AS driver_name 
                       FROM trips t
                       LEFT JOIN users u ON u.id = t.rider_id 
                       LEFT JOIN drivers d ON d.id = t.driver_id
                       ORDER BY t.requested_at DESC 
                       LIMIT $1 OFFSET $2`;
    
    const [countResult, dataResult] = await Promise.all([
      query(countQuery),
      query(dataQuery, [limit, offset]),
    ]);
    
    const total = parseInt(countResult.rows[0].count, 10);
    res.json(paginatedResponse(dataResult.rows, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ---------- Fare config ----------
// GET /api/admin/fare
router.get('/fare', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM fare_config WHERE active = TRUE');
    res.json({ success: true, config: r.rows });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/fare/:rideType
router.patch('/fare/:rideType', [
  body('base_fare').optional().isFloat({ min: 0 }),
  body('per_km').optional().isFloat({ min: 0 }),
  body('per_minute').optional().isFloat({ min: 0 }),
  body('min_fare').optional().isFloat({ min: 0 }),
  body('surge_multiplier').optional().isFloat({ min: 1 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const updates = [];
    const values = [];
    let i = 1;
    ['base_fare', 'per_km', 'per_minute', 'min_fare', 'surge_multiplier'].forEach((f) => {
      if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); values.push(req.body[f]); }
    });
    if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
    values.push(req.params.rideType);
    await query(`UPDATE fare_config SET ${updates.join(', ')}, updated_at = NOW() WHERE ride_type = $${i}`, values);
    const r = await query('SELECT * FROM fare_config WHERE ride_type = $1', [req.params.rideType]);
    res.json({ success: true, config: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------- Commission ----------
// GET /api/admin/commission
router.get('/commission', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM commission_config WHERE active = TRUE LIMIT 1');
    res.json({ success: true, commission: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/commission
router.patch('/commission', [body('percentage').isFloat({ min: 0, max: 100 })], async (req, res, next) => {
  try {
    await query('UPDATE commission_config SET percentage = $1 WHERE active = TRUE', [req.body.percentage]);
    const r = await query('SELECT * FROM commission_config WHERE active = TRUE LIMIT 1');
    res.json({ success: true, commission: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------- Reports ----------
// GET /api/admin/reports/summary
router.get('/reports/summary', async (req, res, next) => {
  try {
    const trips = await query(
      `SELECT COUNT(*) AS total_rides, COALESCE(SUM(fare_amount), 0) AS total_revenue, COALESCE(SUM(commission_amount), 0) AS total_commission FROM trips WHERE status = 'completed'`
    );
    const drivers = await query("SELECT COUNT(*) AS active_drivers FROM drivers WHERE status = 'approved' AND is_online = TRUE");
    res.json({
      success: true,
      summary: {
        total_rides: parseInt(trips.rows[0].total_rides, 10),
        total_revenue: parseFloat(trips.rows[0].total_revenue),
        total_commission: parseFloat(trips.rows[0].total_commission),
        active_drivers: parseInt(drivers.rows[0].active_drivers, 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/cash-reconciliation — Syria: daily cash expected vs collected
router.get('/cash-reconciliation', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);
    const r = await query(
      `SELECT d.full_name, d.phone, tcr.driver_id,
              SUM(tcr.expected_amount) AS expected, SUM(tcr.collected_amount) AS collected, COUNT(*) AS trips
       FROM trip_cash_records tcr
       JOIN drivers d ON d.id = tcr.driver_id
       JOIN trips t ON t.id = tcr.trip_id AND t.completed_at::date = $1::date
       WHERE tcr.confirmed_at IS NOT NULL
       GROUP BY tcr.driver_id, d.full_name, d.phone`,
      [date]
    );
    res.json({ success: true, date, summary: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/crisis — Syria: list crisis events
router.get('/crisis', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM crisis_events ORDER BY started_at DESC LIMIT 50');
    res.json({ success: true, crises: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/risk-zones — Syria: list risk zones
router.get('/risk-zones', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM risk_zones ORDER BY created_at DESC');
    res.json({ success: true, zones: r.rows });
  } catch (err) {
    next(err);
  }
});

// ---------- System Settings ----------
// GET /api/admin/system-settings
router.get('/system-settings', async (req, res, next) => {
  try {
    const r = await query('SELECT key, value FROM system_settings');
    const settings = {};
    r.rows.forEach(s => settings[s.key] = s.value);
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/system-settings
router.patch('/system-settings', async (req, res, next) => {
  try {
    const { settings } = req.body;
    if (!settings) return res.status(400).json({ success: false, error: 'No settings provided' });

    for (const [key, value] of Object.entries(settings)) {
      await query('INSERT INTO system_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()', [key, String(value)]);
    }

    const r = await query('SELECT key, value FROM system_settings');
    const updated = {};
    r.rows.forEach(s => updated[s.key] = s.value);
    res.json({ success: true, settings: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
