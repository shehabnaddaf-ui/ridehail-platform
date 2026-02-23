/**
 * Trust: driver trust score breakdown (driving, cancellation, feedback)
 * Product: Transparency builds rider confidence; not just a single star.
 */

const express = require('express');
const { query } = require('../db/client');
const { authUser } = require('../middleware/auth');

const router = express.Router();

// GET /api/trust/driver/:driverId — Trust score breakdown for rider to see
router.get('/driver/:driverId', authUser, async (req, res, next) => {
  try {
    const driverId = req.params.driverId;
    const scoreRes = await query(
      'SELECT overall_score, driving_behavior_score, cancellation_behavior_score, rider_feedback_score, trip_count_for_score FROM driver_trust_scores WHERE driver_id = $1',
      [driverId]
    );
    const driverRes = await query('SELECT full_name, rating, total_trips FROM drivers WHERE id = $1', [driverId]);
    if (driverRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Driver not found' });
    const driver = driverRes.rows[0];
    const score = scoreRes.rows[0] || {
      overall_score: driver.rating,
      driving_behavior_score: driver.rating,
      cancellation_behavior_score: 5.0,
      rider_feedback_score: driver.rating,
      trip_count_for_score: driver.total_trips || 0,
    };
    res.json({
      success: true,
      trust: {
        overall: Number(score.overall_score),
        driving_behavior: Number(score.driving_behavior_score),
        cancellation_behavior: Number(score.cancellation_behavior_score),
        rider_feedback: Number(score.rider_feedback_score),
        trip_count: parseInt(score.trip_count_for_score, 10) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
