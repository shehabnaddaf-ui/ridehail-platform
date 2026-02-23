const express = require('express');
const { body, validationResult } = require('express-validator');
const { query, withTransaction } = require('../db/client');
const { authUser, authDriver } = require('../middleware/auth');
const { findNearestDrivers } = require('../services/matching');
const { estimateFareForTrip, calculateFinalFare } = require('../services/fare');
const { getIo } = require('../socket');
const { v4: uuidv4 } = require('uuid');
const { validateCoordinates, validateTripDistance } = require('../utils/validation');
const logger = require('../utils/logger');

const router = express.Router();

// ---------- Rider: estimate fare ----------
// POST /api/trips/estimate
router.post(
  '/estimate',
  authUser,
  [
    body('pickup_lat').isFloat(),
    body('pickup_lng').isFloat(),
    body('dropoff_lat').isFloat(),
    body('dropoff_lng').isFloat(),
    body('ride_type').optional().isIn(['economy', 'premium', 'xl']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, ride_type = 'economy' } = req.body;
      // Simplified: use straight-line distance * 1.3 for road distance, 30 km/h avg for time
      const distanceKm = 1.3 * require('../services/matching').haversineKm(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);
      const durationMin = Math.max(1, Math.round((distanceKm / 30) * 60));
      const surge = 1.0; // TODO: surge from demand
      const { estimatedFare } = await estimateFareForTrip(ride_type, distanceKm, durationMin, surge);
      res.json({
        success: true,
        estimate: {
          distance_km: Math.round(distanceKm * 100) / 100,
          duration_min: durationMin,
          fare: estimatedFare,
          ride_type,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Rider: request ride ----------
// POST /api/trips
router.post(
  '/',
  authUser,
  [
    body('pickup_lat').isFloat(),
    body('pickup_lng').isFloat(),
    body('dropoff_lat').isFloat(),
    body('dropoff_lng').isFloat(),
    body('pickup_address').optional().trim(),
    body('dropoff_address').optional().trim(),
    body('ride_type').optional().isIn(['economy', 'premium', 'xl']),
    body('payment_method').optional().isIn(['cash', 'card']),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const {
        pickup_lat, pickup_lng, dropoff_lat, dropoff_lng,
        pickup_address, dropoff_address, ride_type = 'economy', payment_method = 'cash',
      } = req.body;

      // Validate coordinates
      const pickupValidation = validateCoordinates(pickup_lat, pickup_lng);
      if (!pickupValidation.valid) {
        return res.status(400).json({ success: false, error: pickupValidation.error });
      }

      const dropoffValidation = validateCoordinates(dropoff_lat, dropoff_lng);
      if (!dropoffValidation.valid) {
        return res.status(400).json({ success: false, error: dropoffValidation.error });
      }

      // Check for active trips (prevent duplicates)
      const activeTrip = await query(
        `SELECT id FROM trips WHERE rider_id = $1 AND status IN ('requested', 'accepted', 'driver_arriving', 'in_progress') LIMIT 1`,
        [req.userId]
      );

      if (activeTrip.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'You already have an active trip',
          tripId: activeTrip.rows[0].id,
        });
      }

      const distanceKm = 1.3 * require('../services/matching').haversineKm(pickup_lat, pickup_lng, dropoff_lat, dropoff_lng);
      
      // Validate trip distance
      const distanceValidation = validateTripDistance(distanceKm);
      if (!distanceValidation.valid) {
        return res.status(400).json({ success: false, error: distanceValidation.error });
      }

      const durationMin = Math.max(1, Math.round((distanceKm / 30) * 60));
      
      // TODO: Implement dynamic surge pricing based on demand
      const surge = 1.0;
      
      const { estimatedFare } = await estimateFareForTrip(ride_type, distanceKm, durationMin, surge);

      // VIP priority: pass riderId for VIP check
      const drivers = await findNearestDrivers(pickup_lat, pickup_lng, ride_type, 1, req.userId);
      
      if (drivers.length === 0) {
        logger.warn('No drivers available', { riderId: req.userId, pickup_lat, pickup_lng });
        return res.status(503).json({ success: false, error: 'No drivers available' });
      }

      // Use transaction for trip creation
      const trip = await withTransaction(async (client) => {
        const tripId = uuidv4();
        
        await client.query(
          `INSERT INTO trips (id, rider_id, driver_id, ride_type, status, pickup_lat, pickup_lng, pickup_address,
            dropoff_lat, dropoff_lng, dropoff_address, estimated_distance_km, estimated_duration_min, estimated_fare, payment_method, surge_multiplier)
           VALUES ($1, $2, $3, $4, 'accepted', $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            tripId, req.userId, drivers[0].id, ride_type,
            pickup_lat, pickup_lng, pickup_address || null,
            dropoff_lat, dropoff_lng, dropoff_address || null,
            distanceKm, durationMin, estimatedFare, payment_method, surge,
          ]
        );
        
        // Don't set driver offline - they can still receive requests
        // await client.query(`UPDATE drivers SET is_online = TRUE WHERE id = $1`, [drivers[0].id]);

        const tripRes = await client.query(
          `SELECT t.*, d.full_name AS driver_name, d.phone AS driver_phone, d.rating AS driver_rating, d.current_lat AS driver_lat, d.current_lng AS driver_lng
           FROM trips t JOIN drivers d ON d.id = t.driver_id WHERE t.id = $1`,
          [tripId]
        );
        
        return tripRes.rows[0];
      });

      // Emit socket events
      const io = getIo();
      if (io) {
        io.to(`driver:${drivers[0].id}`).emit('ride_request', trip);
        io.to(`user:${req.userId}`).emit('trip_matched', trip);
      }

      logger.info('Trip created', { tripId: trip.id, riderId: req.userId, driverId: drivers[0].id });
      res.status(201).json({ success: true, trip });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/trips (rider history)
router.get('/', authUser, async (req, res, next) => {
  try {
    const { parsePagination, paginatedResponse } = require('../utils/pagination');
    const { page, limit, offset } = parsePagination(req.query);
    const status = req.query.status;
    
    let countQuery = 'SELECT COUNT(*) FROM trips WHERE rider_id = $1';
    let dataQuery = 'SELECT t.*, d.full_name AS driver_name, d.rating AS driver_rating FROM trips t LEFT JOIN drivers d ON d.id = t.driver_id WHERE t.rider_id = $1';
    const params = [req.userId];
    
    if (status) {
      countQuery += ' AND status = $2';
      dataQuery += ' AND t.status = $2';
      params.push(status);
    }
    
    dataQuery += ' ORDER BY t.requested_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    
    const [countResult, dataResult] = await Promise.all([
      query(countQuery, params.slice(0, status ? 2 : 1)),
      query(dataQuery, params),
    ]);
    
    const total = parseInt(countResult.rows[0].count, 10);
    res.json(paginatedResponse(dataResult.rows, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ---------- Rider: trip by id ----------
// GET /api/trips/:id
router.get('/:id', authUser, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT t.*, d.full_name AS driver_name, d.phone AS driver_phone, d.rating AS driver_rating
       FROM trips t LEFT JOIN drivers d ON d.id = t.driver_id WHERE t.id = $1 AND t.rider_id = $2`,
      [req.params.id, req.userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
    res.json({ success: true, trip: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------- Rider: cancel trip ----------
// POST /api/trips/:id/cancel
router.post('/:id/cancel', authUser, [body('reason').optional().trim()], async (req, res, next) => {
  try {
    const tripRes = await query('SELECT * FROM trips WHERE id = $1 AND rider_id = $2', [req.params.id, req.userId]);
    if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
    const trip = tripRes.rows[0];
    if (!['requested', 'accepted', 'driver_arriving'].includes(trip.status)) {
      return res.status(400).json({ success: false, error: 'Trip cannot be cancelled' });
    }
    const rulesRes = await query('SELECT free_cancel_minutes, cancel_fee FROM cancellation_rules WHERE active = TRUE LIMIT 1');
    const rules = rulesRes.rows[0] || { free_cancel_minutes: 5, cancel_fee: 5 };
    const requestedAt = new Date(trip.requested_at);
    const minutesSince = (Date.now() - requestedAt.getTime()) / 60000;
    const cancelFee = minutesSince > rules.free_cancel_minutes ? Number(rules.cancel_fee) : 0;
    await query(
      `UPDATE trips SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = $1, cancel_fee = $2, updated_at = NOW() WHERE id = $3`,
      [req.body.reason || null, cancelFee, req.params.id]
    );
    const io = getIo();
    if (io && trip.driver_id) io.to(`driver:${trip.driver_id}`).emit('trip_cancelled', { tripId: req.params.id });
    res.json({ success: true, cancel_fee: cancelFee });
  } catch (err) {
    next(err);
  }
});

// GET /api/trips/driver/list (driver only)
router.get('/driver/list', authDriver, async (req, res, next) => {
  try {
    const { parsePagination, paginatedResponse } = require('../utils/pagination');
    const { page, limit, offset } = parsePagination(req.query);
    const driverId = req.driverId;
    
    const countQuery = 'SELECT COUNT(*) FROM trips WHERE driver_id = $1';
    const dataQuery = `SELECT t.*, u.full_name AS rider_name FROM trips t 
                       LEFT JOIN users u ON u.id = t.rider_id 
                       WHERE t.driver_id = $1 
                       ORDER BY t.requested_at DESC 
                       LIMIT $2 OFFSET $3`;
    
    const [countResult, dataResult] = await Promise.all([
      query(countQuery, [driverId]),
      query(dataQuery, [driverId, limit, offset]),
    ]);
    
    const total = parseInt(countResult.rows[0].count, 10);
    res.json(paginatedResponse(dataResult.rows, total, page, limit));
  } catch (err) {
    next(err);
  }
});

// ---------- Driver: update location (also used by socket) ----------
// POST /api/drivers/location is in drivers.js

// ---------- Driver: accept ride (optional - we auto-assign in this flow; can add accept/reject later)
// ---------- Driver: start ride / complete ride ----------
// PATCH /api/trips/:id/status (driver only)
router.patch(
  '/:id/status',
  authDriver,
  [body('status').isIn(['driver_arriving', 'in_progress', 'completed'])],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const driverId = req.driverId;
      const { status } = req.body;
      const tripRes = await query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (trip.driver_id !== driverId) return res.status(403).json({ success: false, error: 'Not your trip' });

      if (status === 'driver_arriving') {
        await query(`UPDATE trips SET status = 'driver_arriving', updated_at = NOW() WHERE id = $1`, [req.params.id]);
        const io = getIo();
        if (io) io.to(`user:${trip.rider_id}`).emit('trip_status', { tripId: req.params.id, status: 'driver_arriving' });
      } else if (status === 'in_progress') {
        await query(`UPDATE trips SET status = 'in_progress', started_at = NOW(), updated_at = NOW() WHERE id = $1`, [req.params.id]);
        const io = getIo();
        if (io) io.to(`user:${trip.rider_id}`).emit('trip_status', { tripId: req.params.id, status: 'in_progress' });
      } else if (status === 'completed') {
        // Use transaction for trip completion
        await withTransaction(async (client) => {
          const finalDuration = trip.started_at 
            ? Math.round((Date.now() - new Date(trip.started_at).getTime()) / 60000) 
            : trip.estimated_duration_min;
          const finalDistance = trip.estimated_distance_km;
          const fareAmount = await calculateFinalFare(req.params.id);
          
          const commissionRes = await client.query('SELECT percentage FROM commission_config WHERE active = TRUE LIMIT 1');
          const commissionPct = commissionRes.rows[0] ? Number(commissionRes.rows[0].percentage) : 20;
          const commissionAmount = Math.round((fareAmount * commissionPct / 100) * 100) / 100;
          const driverEarnings = Math.round((fareAmount - commissionAmount) * 100) / 100;
          
          // Update trip
          await client.query(
            `UPDATE trips SET status = 'completed', completed_at = NOW(), final_distance_km = $1, final_duration_min = $2, 
             fare_amount = $3, commission_amount = $4, driver_earnings = $5, updated_at = NOW() WHERE id = $6`,
            [finalDistance, finalDuration, fareAmount, commissionAmount, driverEarnings, req.params.id]
          );
          
          // Update driver wallet and stats
          await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE driver_id = $2', [driverEarnings, trip.driver_id]);
          await client.query('UPDATE drivers SET total_trips = total_trips + 1, updated_at = NOW() WHERE id = $1', [trip.driver_id]);
        });
        
        // Process VIP rewards (async, don't block response)
        const { processVIPRewards, updateWeeklyTripCounts, checkAndActivateVIP } = require('../services/vip');
        
        updateWeeklyTripCounts().then(() => checkAndActivateVIP()).then((activated) => {
          if (activated.some((a) => a.userId === trip.rider_id)) {
            const { sendVIPActivationNotification } = require('../services/fcm');
            sendVIPActivationNotification(trip.rider_id).catch((err) => {
              logger.error('Failed to send VIP activation notification', { error: err.message });
            });
          }
        }).catch((err) => {
          logger.error('VIP auto-activation failed', { error: err.message });
        });
        
        // Process reward
        const reward = await processVIPRewards(req.params.id, trip.rider_id);
        
        const io = getIo();
        if (io) {
          io.to(`user:${trip.rider_id}`).emit('trip_completed', { tripId: req.params.id, fare_amount: fareAmount, reward });
          if (reward) {
            const { sendVIPRewardNotification } = require('../services/fcm');
            sendVIPRewardNotification(trip.rider_id, reward).catch((err) => {
              logger.error('Failed to send VIP reward notification', { error: err.message });
            });
            io.to(`user:${trip.rider_id}`).emit('vip_reward_unlocked', reward);
          }
        }
        
        logger.info('Trip completed', { tripId: req.params.id, driverId: trip.driver_id, fareAmount });
      }

      const updated = await query('SELECT * FROM trips WHERE id = $1', [req.params.id]);
      res.json({ success: true, trip: updated.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// ---------- Syria: Safe arrival confirmation (rider) ----------
// POST /api/trips/:id/safe-arrival
router.post('/:id/safe-arrival', authUser, async (req, res, next) => {
  try {
    const r = await query('SELECT id, rider_id, driver_id, status FROM trips WHERE id = $1 AND rider_id = $2', [req.params.id, req.userId]);
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
    const trip = r.rows[0];
    if (trip.status !== 'completed') return res.status(400).json({ success: false, error: 'Trip must be completed first' });
    await query('UPDATE trips SET safe_arrival_confirmed_at = NOW(), updated_at = NOW() WHERE id = $1', [req.params.id]);
    await query('INSERT INTO safety_events (trip_id, user_id, event_type, payload) VALUES ($1, $2, $3, $4)', [req.params.id, req.userId, 'safe_arrival', '{}']);
    const io = getIo();
    if (io) io.to(`driver:${trip.driver_id}`).emit('safe_arrival_confirmed', { tripId: req.params.id });
    res.json({ success: true, message: 'Safe arrival recorded' });
  } catch (err) {
    next(err);
  }
});

// ---------- Syria: Driver confirm cash received ----------
// POST /api/trips/:id/cash-received
router.post('/:id/cash-received', authDriver, [body('amount').isFloat({ min: 0 }), body('notes').optional().trim()], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const tripRes = await query('SELECT id, driver_id, fare_amount, status FROM trips WHERE id = $1', [req.params.id]);
    if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
    const trip = tripRes.rows[0];
    if (trip.driver_id !== req.driverId) return res.status(403).json({ success: false, error: 'Forbidden' });
    if (trip.status !== 'completed') return res.status(400).json({ success: false, error: 'Trip not completed' });
    const expected = Number(trip.fare_amount) || 0;
    await query(
      `INSERT INTO trip_cash_records (trip_id, driver_id, expected_amount, collected_amount, confirmed_at, notes, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), $5, NOW())
       ON CONFLICT (trip_id) DO UPDATE SET collected_amount = EXCLUDED.collected_amount, confirmed_at = NOW(), notes = EXCLUDED.notes, updated_at = NOW()`,
      [req.params.id, req.driverId, expected, req.body.amount, req.body.notes || null]
    );
    res.json({ success: true, expected, collected: req.body.amount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
