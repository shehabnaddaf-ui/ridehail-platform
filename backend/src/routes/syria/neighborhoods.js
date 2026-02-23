/**
 * Neighborhoods / trust clusters — for pickup suggestions and "known in your area"
 */

const express = require('express');
const { query } = require('../../db/client');

const router = express.Router();

// GET /api/neighborhoods
router.get('/', async (req, res, next) => {
  try {
    const r = await query(
      'SELECT id, name_ar, name_en, center_lat, center_lng, radius_km, city FROM neighborhoods WHERE active = TRUE'
    );
    res.json({
      success: true,
      neighborhoods: r.rows.map((n) => ({
        id: n.id,
        name_ar: n.name_ar,
        name_en: n.name_en,
        center: { lat: Number(n.center_lat), lng: Number(n.center_lng) },
        radius_km: Number(n.radius_km),
        city: n.city,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
