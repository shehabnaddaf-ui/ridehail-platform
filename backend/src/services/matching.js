/**
 * Driver matching: nearest available driver by location, with rating priority
 */

const { query } = require('../db/client');

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Find nearest available drivers for a ride type.
 * Uses simple bounding box + in-memory sort by distance and rating.
 * VIP users get priority (sorted first).
 */
async function findNearestDrivers(pickupLat, pickupLng, rideType, limit = 5, riderId = null) {
  const delta = 0.1; // ~11km rough box
  
  // Check if rider is VIP
  let isVIP = false;
  if (riderId) {
    const vipRes = await query('SELECT vip_status FROM users WHERE id = $1', [riderId]);
    isVIP = vipRes.rows[0]?.vip_status || false;
  }
  
  const res = await query(
    `SELECT d.id, d.full_name, d.rating, d.current_lat, d.current_lng, v.ride_types
     FROM drivers d
     LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_primary = TRUE
     WHERE d.status = 'approved' AND d.is_online = TRUE
       AND d.current_lat IS NOT NULL AND d.current_lng IS NOT NULL
       AND d.current_lat BETWEEN $1 AND $2 AND d.current_lng BETWEEN $3 AND $4
       AND (v.ride_types IS NULL OR $5::ride_type = ANY(v.ride_types))`,
    [pickupLat - delta, pickupLat + delta, pickupLng - delta, pickupLng + delta, rideType]
  );

  const withDistance = res.rows.map((row) => ({
    ...row,
    distanceKm: haversineKm(
      Number(pickupLat),
      Number(pickupLng),
      Number(row.current_lat),
      Number(row.current_lng)
    ),
  }));

  // VIP priority: sort VIP requests first, then by distance/rating
  withDistance.sort((a, b) => {
    if (isVIP) {
      // For VIP: prioritize closer drivers more aggressively
      const distDiff = a.distanceKm - b.distanceKm;
      if (Math.abs(distDiff) < 1.0) { // Wider tolerance for VIP
        return (b.rating || 0) - (a.rating || 0);
      }
      return distDiff;
    } else {
      // Regular: standard sorting
      const distDiff = a.distanceKm - b.distanceKm;
      if (Math.abs(distDiff) < 0.5) {
        return (b.rating || 0) - (a.rating || 0);
      }
      return distDiff;
    }
  });

  return withDistance.slice(0, limit).map(({ id, full_name, rating, current_lat, current_lng, distanceKm }) => ({
    id,
    full_name,
    rating: Number(rating),
    current_lat: Number(current_lat),
    current_lng: Number(current_lng),
    distance_km: Math.round(distanceKm * 100) / 100,
  }));
}

module.exports = { findNearestDrivers, haversineKm };
