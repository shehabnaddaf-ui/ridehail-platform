/**
 * Smart zones: high-demand areas for drivers (clear guidance, not chaos)
 * Product: "Smart zones" instead of raw heatmaps; respect driver autonomy.
 */

const express = require('express');
const { query } = require('../db/client');
const { authDriver } = require('../middleware/auth');

const router = express.Router();

// GET /api/zones — Active smart zones (for driver app)
router.get('/', authDriver, async (req, res, next) => {
  try {
    const resZones = await query(
      `SELECT id, name, center_lat, center_lng, radius_km, demand_level, message, valid_until
       FROM smart_zones WHERE active = TRUE AND (valid_until IS NULL OR valid_until > NOW()) ORDER BY demand_level DESC`
    );
    const zones = resZones.rows.map((z) => ({
      id: z.id,
      name: z.name,
      center: { lat: Number(z.center_lat), lng: Number(z.center_lng) },
      radius_km: Number(z.radius_km),
      demand_level: z.demand_level,
      message: z.message || `High demand in ${z.name}`,
      valid_until: z.valid_until,
    }));
    res.json({ success: true, zones });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
