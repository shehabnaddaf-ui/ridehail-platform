/**
 * Payments: Stripe card payments, cash handling, receipts
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authUser } = require('../middleware/auth');
const Stripe = require('stripe');

const router = express.Router();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' }) : null;

// POST /api/payments/create-intent - Create Stripe PaymentIntent for a trip
router.post(
  '/create-intent',
  authUser,
  [body('trip_id').isUUID(), body('amount').isFloat({ min: 0.01 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      if (!stripe) return res.status(503).json({ success: false, error: 'Stripe not configured' });
      const { trip_id, amount } = req.body;
      const tripRes = await query('SELECT rider_id, fare_amount, status FROM trips WHERE id = $1', [trip_id]);
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (trip.rider_id !== req.userId) return res.status(403).json({ success: false, error: 'Forbidden' });
      if (trip.status !== 'completed') return res.status(400).json({ success: false, error: 'Trip not completed' });

      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        metadata: { trip_id },
      });
      res.json({ success: true, client_secret: intent.client_secret, payment_intent_id: intent.id });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/payments/confirm - Confirm payment (webhook or client callback)
router.post(
  '/confirm',
  authUser,
  [body('trip_id').isUUID(), body('payment_intent_id').optional().trim()],
  async (req, res, next) => {
    try {
      const { trip_id, payment_intent_id } = req.body;
      const tripRes = await query('SELECT rider_id, driver_id, fare_amount FROM trips WHERE id = $1', [trip_id]);
      if (tripRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
      const trip = tripRes.rows[0];
      if (trip.rider_id !== req.userId) return res.status(403).json({ success: false, error: 'Forbidden' });

      await query(
        `INSERT INTO payments (trip_id, amount, status, payment_method, rider_id, driver_id) VALUES ($1, $2, 'completed', 'card', $3, $4)`,
        [trip_id, trip.fare_amount, req.userId, trip.driver_id]
      );
      res.json({ success: true, message: 'Payment recorded' });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/payments/receipt/:tripId
router.get('/receipt/:tripId', authUser, async (req, res, next) => {
  try {
    const r = await query(
      `SELECT t.*, d.full_name AS driver_name, u.full_name AS rider_name
       FROM trips t LEFT JOIN drivers d ON d.id = t.driver_id LEFT JOIN users u ON u.id = t.rider_id
       WHERE t.id = $1 AND t.rider_id = $2`,
      [req.params.tripId, req.userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'Trip not found' });
    const trip = r.rows[0];
    res.json({
      success: true,
      receipt: {
        trip_id: trip.id,
        rider_name: trip.rider_name,
        driver_name: trip.driver_name,
        pickup_address: trip.pickup_address,
        dropoff_address: trip.dropoff_address,
        distance_km: trip.final_distance_km || trip.estimated_distance_km,
        duration_min: trip.final_duration_min || trip.estimated_duration_min,
        fare_amount: trip.fare_amount,
        payment_method: trip.payment_method,
        completed_at: trip.completed_at,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
