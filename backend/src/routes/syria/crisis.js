/**
 * Crisis mode & risk zones — Syria: weather, events, security
 */

const express = require('express');
const { query } = require('../../db/client');

const router = express.Router();

// GET /api/crisis/active — public / rider / driver
router.get('/active', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, name_ar, name_en, scope, message_ar, message_en, rider_advice_ar, rider_advice_en, driver_advice_ar, driver_advice_en, allow_new_rides
       FROM crisis_events WHERE active = TRUE AND (ended_at IS NULL OR ended_at > NOW())`
    );
    res.json({ success: true, crises: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/risk-zones — public
router.get('/risk-zones', async (req, res, next) => {
  try {
    const r = await query(
      `SELECT id, name_ar, name_en, center_lat, center_lng, radius_km, risk_level, reason
       FROM risk_zones WHERE active = TRUE AND (valid_until IS NULL OR valid_until > NOW())`
    );
    res.json({
      success: true,
      zones: r.rows.map((z) => ({
        id: z.id,
        name_ar: z.name_ar,
        name_en: z.name_en,
        center: { lat: Number(z.center_lat), lng: Number(z.center_lng) },
        radius_km: Number(z.radius_km),
        risk_level: z.risk_level,
        reason: z.reason,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
