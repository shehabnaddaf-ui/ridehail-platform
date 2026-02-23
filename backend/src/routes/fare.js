/**
 * Fare configuration (public estimate + admin config later)
 */

const express = require('express');
const { query } = require('../db/client');
const { getFareConfig, estimateFareForTrip } = require('../services/fare');

const router = express.Router();

// GET /api/fare/config - Public fare config for display
router.get('/config', async (req, res, next) => {
  try {
    const r = await query('SELECT ride_type, base_fare, per_km, per_minute, min_fare FROM fare_config WHERE active = TRUE');
    res.json({ success: true, config: r.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/fare/estimate - Public estimation with Range
router.get('/estimate', async (req, res, next) => {
  try {
    const { ride_type, distance_km, duration_min } = req.query;

    // Estimate with "average" driver (e.g. 250km/tanaka)
    const { estimatedFare, settings } = await estimateFareForTrip(ride_type || 'economy', Number(distance_km), Number(duration_min));

    // Create a range (+/- 15% to account for driver variety)
    const minRange = Math.round(estimatedFare * 0.85);
    const maxRange = Math.round(estimatedFare * 1.15);

    res.json({
      success: true,
      estimatedFare,
      range: { min: minRange, max: maxRange },
      fuel_price: settings.fuel_price_liter
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
