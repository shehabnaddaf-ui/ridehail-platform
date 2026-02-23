/**
 * Disputes: rider/driver raise; admin resolves (AI-assisted later)
 * Product: AI-assisted dispute resolution; faster, fairer outcomes.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authUser, authDriver, authAdmin } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/disputes — Rider or driver raises dispute
router.post(
  '/',
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Token required' });
      const token = authHeader.split(' ')[1];
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { trip_id, reason } = req.body;
      if (!trip_id || !reason?.trim()) return res.status(400).json({ success: false, error: 'trip_id and reason required' });

      let riderId = null;
      let driverId = null;
      let raisedBy = null;
      if (decoded.userId) {
        riderId = decoded.userId;
        raisedBy = 'rider';
      } else if (decoded.driverId) {
        driverId = decoded.driverId;
        raisedBy = 'driver';
      } else return res.status(403).json({ success: false, error: 'Rider or driver only' });

      const tripRes = await query('SELECT id, rider_id, driver_id, status FROM trips WHERE id = $1', [trip_id]);
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (raisedBy === 'rider' && trip.rider_id !== riderId) return res.status(403).json({ success: false, error: 'Forbidden' });
      if (raisedBy === 'driver' && trip.driver_id !== driverId) return res.status(403).json({ success: false, error: 'Forbidden' });
      if (!['completed', 'cancelled'].includes(trip.status)) return res.status(400).json({ success: false, error: 'Trip must be completed or cancelled' });

      const id = uuidv4();
      await query(
        'INSERT INTO disputes (id, trip_id, raised_by, rider_id, driver_id, reason, status) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [id, trip_id, raisedBy, trip.rider_id, trip.driver_id, reason.trim(), 'open']
      );
      res.status(201).json({ success: true, dispute_id: id });
    } catch (err) {
      next(err);
    }
  }
);

// Admin routes
router.get('/admin', authAdmin, async (req, res, next) => {
  try {
    const status = req.query.status || 'open';
    const r = await query(
      `SELECT d.*, t.pickup_address, t.dropoff_address, t.fare_amount, t.status AS trip_status
       FROM disputes d LEFT JOIN trips t ON t.id = d.trip_id
       WHERE d.status = $1 ORDER BY d.created_at DESC LIMIT 50`,
      [status]
    );
    res.json({ success: true, disputes: r.rows });
  } catch (err) {
    next(err);
  }
});

router.get('/admin/:id', authAdmin, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT d.*, t.pickup_address, t.dropoff_address, t.fare_amount, t.status AS trip_status, t.requested_at, t.completed_at
       FROM disputes d LEFT JOIN trips t ON t.id = d.trip_id WHERE d.id = $1`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Dispute not found' });
    const dispute = r.rows[0];
    dispute.ai_suggestion = dispute.ai_suggestion || { suggested_outcome: 'review_manually', confidence: 0 };
    res.json({ success: true, dispute });
  } catch (err) {
    next(err);
  }
});

router.patch('/admin/:id/resolve', authAdmin, [body('resolution_notes').optional().trim(), body('outcome').optional().isIn(['refund_full', 'refund_partial', 'no_action', 'warning'])], async (req, res, next) => {
  try {
    await query(
      'UPDATE disputes SET status = $1, resolution_notes = $2, resolved_by = $3, resolved_at = NOW(), updated_at = NOW() WHERE id = $4',
      ['resolved', req.body.resolution_notes || null, req.adminId, req.params.id]
    );
    const r = await query('SELECT * FROM disputes WHERE id = $1', [req.params.id]);
    res.json({ success: true, dispute: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
