/**
 * Safe pickup points — suggest safe/common spots near rider
 * Syria: reduces "where exactly?" anxiety
 */

const express = require('express');
const { query } = require('../../db/client');

const router = express.Router();

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// GET /api/pickup-points?lat=&lng=&limit=10
router.get('/', async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ success: false, error: 'lat and lng required' });
    }
    const r = await query(
      'SELECT id, name_ar, name_en, lat, lng, address_text FROM safe_pickup_points WHERE is_active = TRUE'
    );
    const withDist = r.rows.map((row) => ({
      ...row,
      distance_km: haversineKm(lat, lng, Number(row.lat), Number(row.lng)),
    }));
    withDist.sort((a, b) => a.distance_km - b.distance_km);
    const out = withDist.slice(0, limit).map(({ id, name_ar, name_en, lat: la, lng: ln, address_text, distance_km }) => ({
      id,
      name_ar,
      name_en,
      lat: Number(la),
      lng: Number(ln),
      address_text,
      distance_km: Math.round(distance_km * 100) / 100,
    }));
    res.json({ success: true, points: out });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
