/**
 * Safety: trip sharing, one-tap emergency, route deviation (signals)
 * Product: Reduces rider anxiety; builds trust via visible safety layer.
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authUser } = require('../middleware/auth');
const { getIo } = require('../socket');
const crypto = require('crypto');

const router = express.Router();

const SHARE_LINK_BASE = process.env.SHARE_LINK_BASE || 'https://app.ridehail.com/trip/';

// POST /api/safety/share — Create shareable link for active trip
router.post(
  '/share',
  authUser,
  [body('trip_id').isUUID()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { trip_id } = req.body;
      const tripRes = await query(
        'SELECT id, rider_id, status FROM trips WHERE id = $1 AND rider_id = $2',
        [trip_id, req.userId]
      );
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (!['accepted', 'driver_arriving', 'in_progress'].includes(trip.status)) {
        return res.status(400).json({ success: false, error: 'Trip not active' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await query(
        'INSERT INTO trip_share_links (trip_id, token, expires_at) VALUES ($1, $2, $3)',
        [trip_id, token, expiresAt]
      );
      await query(
        'INSERT INTO safety_events (trip_id, user_id, event_type, payload) VALUES ($1, $2, $3, $4)',
        [trip_id, req.userId, 'share_created', JSON.stringify({})]
      );
      const shareUrl = `${SHARE_LINK_BASE}${token}`;
      res.json({ success: true, share_url: shareUrl, expires_at: expiresAt });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/safety/emergency — One-tap emergency (or silent_emergency for Syria: no panic UI)
router.post(
  '/emergency',
  authUser,
  [body('trip_id').isUUID(), body('lat').optional().isFloat(), body('lng').optional().isFloat(), body('silent').optional().isBoolean()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { trip_id, lat, lng, silent } = req.body;
      const tripRes = await query(
        'SELECT id, rider_id, driver_id, status FROM trips WHERE id = $1 AND rider_id = $2',
        [trip_id, req.userId]
      );
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      const eventType = silent ? 'silent_emergency' : 'emergency';
      await query(
        'INSERT INTO safety_events (trip_id, user_id, event_type, payload) VALUES ($1, $2, $3, $4)',
        [trip_id, req.userId, eventType, JSON.stringify({ lat: lat || null, lng: lng || null })]
      );
      const io = getIo();
      if (io) {
        io.to('admin').emit(silent ? 'silent_emergency_alert' : 'emergency_alert', { tripId: trip_id, riderId: req.userId, driverId: trip.driver_id, lat, lng });
        io.to(`user:${req.userId}`).emit('emergency_ack', { message: 'Help is on the way. We\'ve been notified.', silent: !!silent });
      }
      res.json({ success: true, message: 'Help is on the way. We\'ve been notified.', silent: !!silent });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/safety/trip/:tripId/share-status
router.get('/trip/:tripId/share-status', authUser, async (req, res, next) => {
  try {
    const tripRes = await query(
      'SELECT id FROM trips WHERE id = $1 AND rider_id = $2',
      [req.params.tripId, req.userId]
    );
    if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
    const linkRes = await query(
      'SELECT expires_at FROM trip_share_links WHERE trip_id = $1 AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
      [req.params.tripId]
    );
    res.json({
      success: true,
      shared: linkRes.rows.length > 0,
      expires_at: linkRes.rows[0]?.expires_at || null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
