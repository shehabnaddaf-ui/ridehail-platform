/**
 * Safe arrival confirmation — rider closes the loop for family/platform
 * Syria: "وصلت بأمان" ritual
 */

const express = require('express');
const { query } = require('../../db/client');
const { authUser } = require('../../middleware/auth');
const { getIo } = require('../../socket');

const router = express.Router();

// POST /api/trips/:id/safe-arrival
router.post('/:id/safe-arrival', authUser, async (req, res, next) => {
  try {
    const tripId = req.params.id;
    const r = await query(
      'SELECT id, rider_id, driver_id, status FROM trips WHERE id = $1 AND rider_id = $2',
      [tripId, req.userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
    const trip = r.rows[0];
    if (trip.status !== 'completed') {
      return res.status(400).json({ success: false, error: 'Trip must be completed first' });
    }
    await query(
      'UPDATE trips SET safe_arrival_confirmed_at = NOW(), updated_at = NOW() WHERE id = $1',
      [tripId]
    );
    await query(
      'INSERT INTO safety_events (trip_id, user_id, event_type, payload) VALUES ($1, $2, $3, $4)',
      [tripId, req.userId, 'safe_arrival', JSON.stringify({})]
    );
    const io = getIo();
    if (io) io.to(`driver:${trip.driver_id}`).emit('safe_arrival_confirmed', { tripId });
    res.json({ success: true, message: 'Safe arrival recorded' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
