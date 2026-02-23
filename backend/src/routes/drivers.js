/**
 * Driver profile, location, wallet, earnings
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authDriver } = require('../middleware/auth');

const router = express.Router();

// POST /api/drivers/location - Update driver location (driver auth)
router.post(
  '/location',
  authDriver,
  [body('lat').isFloat(), body('lng').isFloat()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { lat, lng } = req.body;
      await query(
        'UPDATE drivers SET current_lat = $1, current_lng = $2, last_location_at = NOW(), updated_at = NOW() WHERE id = $3',
        [lat, lng, req.driverId]
      );
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/drivers/online - Toggle online/offline
router.patch('/online', authDriver, [body('is_online').isBoolean()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    await query('UPDATE drivers SET is_online = $1, updated_at = NOW() WHERE id = $2', [req.body.is_online, req.driverId]);
    res.json({ success: true, is_online: req.body.is_online });
  } catch (err) {
    next(err);
  }
});

// GET /api/drivers/me - Driver profile (requires authDriver - mount under same router that uses authDriver)
router.get('/me', authDriver, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT d.*, w.balance AS wallet_balance FROM drivers d LEFT JOIN wallets w ON w.driver_id = d.id WHERE d.id = $1`,
      [req.driverId]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Driver not found' });
    const driver = r.rows[0];
    const v = await query('SELECT * FROM vehicles WHERE driver_id = $1 AND is_primary = TRUE', [req.driverId]);
    driver.vehicle = v.rows[0] || null;
    res.json({ success: true, driver });
  } catch (err) {
    next(err);
  }
});

// GET /api/drivers/wallet - Wallet balance and recent earnings
router.get('/wallet', authDriver, async (req, res, next) => {
  try {
    const w = await query('SELECT * FROM wallets WHERE driver_id = $1', [req.driverId]);
    const trips = await query(
      'SELECT id, fare_amount, driver_earnings, completed_at FROM trips WHERE driver_id = $1 AND status = $2 ORDER BY completed_at DESC LIMIT 20',
      [req.driverId, 'completed']
    );
    res.json({
      success: true,
      wallet: w.rows[0] || { balance: 0 },
      recent_earnings: trips.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/drivers/cash-summary — Syria: today's expected vs collected cash
router.get('/cash-summary', authDriver, async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const r = await query(
      `SELECT t.id, t.fare_amount, tcr.collected_amount, tcr.confirmed_at
       FROM trips t
       LEFT JOIN trip_cash_records tcr ON tcr.trip_id = t.id
       WHERE t.driver_id = $1 AND t.status = $2 AND t.completed_at::date = $3::date
       ORDER BY t.completed_at DESC`,
      [req.driverId, 'completed', today]
    );
    let expected = 0, collected = 0;
    r.rows.forEach((row) => {
      expected += Number(row.fare_amount) || 0;
      collected += Number(row.collected_amount) || 0;
    });
    res.json({
      success: true,
      date: today,
      trips_count: r.rows.length,
      expected_total: Math.round(expected * 100) / 100,
      collected_total: Math.round(collected * 100) / 100,
      records: r.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
