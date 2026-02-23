/**
 * Rider user profile and preferences
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authUser } = require('../middleware/auth');

const router = express.Router();
router.use(authUser);

// GET /api/users/me
router.get('/me', async (req, res, next) => {
  try {
    const r = await query(
      'SELECT id, phone, email, full_name, avatar_url, role, is_verified, vip_status, vip_since, vip_level, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (r.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, user: r.rows[0] });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me
router.patch(
  '/me',
  [
    body('full_name').optional().trim().notEmpty(),
    body('email').optional().trim().isEmail(),
    body('avatar_url').optional().isURL(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const updates = [];
      const values = [];
      let i = 1;
      if (req.body.full_name !== undefined) { updates.push(`full_name = $${i++}`); values.push(req.body.full_name); }
      if (req.body.email !== undefined) { updates.push(`email = $${i++}`); values.push(req.body.email); }
      if (req.body.avatar_url !== undefined) { updates.push(`avatar_url = $${i++}`); values.push(req.body.avatar_url); }
      if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
      values.push(req.userId);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i}`, values);
      const r = await query('SELECT id, phone, email, full_name, avatar_url FROM users WHERE id = $1', [req.userId]);
      res.json({ success: true, user: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/users/me/preferences — Default ride type, notifications
router.get('/me/preferences', async (req, res, next) => {
  try {
    const r = await query(
      'SELECT default_ride_type, notification_trip_updates, notification_promos FROM user_preferences WHERE user_id = $1',
      [req.userId]
    );
    const prefs = r.rows[0] || {
      default_ride_type: 'economy',
      notification_trip_updates: true,
      notification_promos: true,
    };
    res.json({ success: true, preferences: prefs });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/preferences
router.patch(
  '/me/preferences',
  [
    body('default_ride_type').optional().isIn(['economy', 'premium', 'xl']),
    body('notification_trip_updates').optional().isBoolean(),
    body('notification_promos').optional().isBoolean(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { default_ride_type, notification_trip_updates, notification_promos } = req.body;
      await query(
        `INSERT INTO user_preferences (user_id, default_ride_type, notification_trip_updates, notification_promos)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO UPDATE SET
           default_ride_type = COALESCE(EXCLUDED.default_ride_type, user_preferences.default_ride_type),
           notification_trip_updates = COALESCE(EXCLUDED.notification_trip_updates, user_preferences.notification_trip_updates),
           notification_promos = COALESCE(EXCLUDED.notification_promos, user_preferences.notification_promos),
           updated_at = NOW()`,
        [req.userId, default_ride_type || 'economy', notification_trip_updates ?? true, notification_promos ?? true]
      );
      const r = await query('SELECT default_ride_type, notification_trip_updates, notification_promos FROM user_preferences WHERE user_id = $1', [req.userId]);
      res.json({ success: true, preferences: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
