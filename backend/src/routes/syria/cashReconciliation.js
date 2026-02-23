/**
 * Cash reconciliation — driver confirms cash received; platform tracks expected vs collected
 * Syria: cash-first, no surprises
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../../db/client');
const { authDriver, authAdmin } = require('../../middleware/auth');

const router = express.Router();

// POST /api/trips/:id/cash-received (driver)
router.post(
  '/:id/cash-received',
  authDriver,
  [body('amount').isFloat({ min: 0 }), body('notes').optional().trim()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const tripId = req.params.id;
      const { amount, notes } = req.body;
      const tripRes = await query(
        'SELECT id, driver_id, fare_amount, status FROM trips WHERE id = $1',
        [tripId]
      );
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (trip.driver_id !== req.driverId) return res.status(403).json({ success: false, error: 'Forbidden' });
      if (trip.status !== 'completed') return res.status(400).json({ success: false, error: 'Trip not completed' });
      const expected = Number(trip.fare_amount) || 0;
      await query(
        `INSERT INTO trip_cash_records (trip_id, driver_id, expected_amount, collected_amount, confirmed_at, notes, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), $5, NOW())
         ON CONFLICT (trip_id) DO UPDATE SET collected_amount = $4, confirmed_at = NOW(), notes = $5, updated_at = NOW()`,
        [tripId, req.driverId, expected, amount, notes || null]
      );
      res.json({ success: true, expected, collected: amount });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/drivers/cash-summary (driver) — today's expected vs collected
router.get('/drivers/cash-summary', authDriver, async (req, res, next) => {
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
    let expected = 0;
    let collected = 0;
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

// GET /api/admin/cash-reconciliation (admin)
router.get('/admin/cash-reconciliation', authAdmin, async (req, res, next) => {
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

module.exports = router;
