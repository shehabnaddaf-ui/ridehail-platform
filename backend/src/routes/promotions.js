/**
 * Promo codes - validate and apply
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authUser } = require('../middleware/auth');

const router = express.Router();

// POST /api/promotions/validate
router.post(
  '/validate',
  authUser,
  [body('code').trim().notEmpty(), body('trip_amount').isFloat({ min: 0 })],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { code, trip_amount } = req.body;
      const r = await query(
        `SELECT * FROM promotions WHERE code = $1 AND active = TRUE AND valid_from <= NOW() AND valid_until >= NOW() AND (max_uses IS NULL OR used_count < max_uses)`,
        [code.toUpperCase()]
      );
      if (r.rows.length === 0) {
        return res.json({ success: false, valid: false, error: 'Invalid or expired code' });
      }
      const promo = r.rows[0];
      if (Number(trip_amount) < Number(promo.min_trip_amount)) {
        return res.json({ success: false, valid: false, error: `Minimum trip amount $${promo.min_trip_amount} required` });
      }
      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = Math.round((trip_amount * Number(promo.discount_value) / 100) * 100) / 100;
      } else {
        discount = Math.min(Number(promo.discount_value), trip_amount);
      }
      res.json({
        success: true,
        valid: true,
        discount,
        final_amount: Math.max(0, trip_amount - discount),
      });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
