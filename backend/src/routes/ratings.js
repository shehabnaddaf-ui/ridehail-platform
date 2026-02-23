/**
 * Ratings: rider rates driver after trip
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authUser, authDriver } = require('../middleware/auth');

const router = express.Router();

// POST /api/ratings - Rider rates driver (authUser)
router.post(
  '/',
  authUser,
  [body('trip_id').isUUID(), body('rating').isInt({ min: 1, max: 5 }), body('comment').optional().trim()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { trip_id, rating, comment } = req.body;
      const tripRes = await query('SELECT rider_id, driver_id, status FROM trips WHERE id = $1', [trip_id]);
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (trip.rider_id !== req.userId) return res.status(403).json({ success: false, error: 'Forbidden' });
      if (trip.status !== 'completed') return res.status(400).json({ success: false, error: 'Trip must be completed' });

      const existing = await query('SELECT id FROM ratings WHERE trip_id = $1', [trip_id]);
      if (existing.rows.length > 0) return res.status(409).json({ success: false, error: 'Already rated' });

      await query(
        'INSERT INTO ratings (trip_id, from_user_id, to_driver_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
        [trip_id, req.userId, trip.driver_id, rating, comment || null]
      );
      const avg = await query(
        'SELECT AVG(rating)::DECIMAL(3,2) AS avg_rating FROM ratings WHERE to_driver_id = $1',
        [trip.driver_id]
      );
      await query('UPDATE drivers SET rating = $1, updated_at = NOW() WHERE id = $2', [avg.rows[0].avg_rating, trip.driver_id]);
      res.status(201).json({ success: true, message: 'Rating submitted' });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/ratings/driver - Driver rates rider (authDriver)
router.post(
  '/driver',
  authDriver,
  [body('trip_id').isUUID(), body('rating').isInt({ min: 1, max: 5 }), body('comment').optional().trim()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { trip_id, rating, comment } = req.body;
      const tripRes = await query('SELECT driver_id, rider_id, status FROM trips WHERE id = $1', [trip_id]);
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (trip.driver_id !== req.driverId) return res.status(403).json({ success: false, error: 'Forbidden' });
      if (trip.status !== 'completed') return res.status(400).json({ success: false, error: 'Trip must be completed' });

      await query(
        'INSERT INTO driver_ratings (trip_id, driver_id, rider_id, rating, comment) VALUES ($1, $2, $3, $4, $5)',
        [trip_id, req.driverId, trip.rider_id, rating, comment || null]
      );
      res.status(201).json({ success: true, message: 'Rating submitted' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
