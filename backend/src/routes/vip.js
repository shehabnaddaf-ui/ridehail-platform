/**
 * VIP System Routes
 * - User VIP status and progress
 * - Admin VIP management
 * - Rewards management
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/client');
const { authUser, authAdmin } = require('../middleware/auth');
const {
  getUserVIPStatus,
  setVIPStatus,
  checkAndActivateVIP,
  updateWeeklyTripCounts,
} = require('../services/vip');
const {
  sendVIPActivationNotification,
  sendVIPRewardNotification,
  sendNotification,
} = require('../services/fcm');

const router = express.Router();

// ========== USER ROUTES ==========

// GET /api/vip/status - Get current user's VIP status and progress
router.get('/status', authUser, async (req, res, next) => {
  try {
    const status = await getUserVIPStatus(req.userId);
    if (!status) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, vip: status });
  } catch (err) {
    next(err);
  }
});

// GET /api/vip/rewards - Get user's reward history
router.get('/rewards', authUser, async (req, res, next) => {
  try {
    const resRewards = await query(
      `SELECT id, trip_id, reward_type, reward_value, description, vip_level_at_reward, given_at, used_at
       FROM vip_rewards WHERE user_id = $1 ORDER BY given_at DESC LIMIT 50`,
      [req.userId]
    );
    res.json({ success: true, rewards: resRewards.rows });
  } catch (err) {
    next(err);
  }
});

// ========== ADMIN ROUTES ==========

router.use(authAdmin);

// GET /api/vip/users - List all users with VIP status
router.get('/users', async (req, res, next) => {
  try {
    const statusFilter = req.query.status; // 'all', 'vip', 'non_vip'
    let q = `SELECT u.id, u.phone, u.full_name, u.vip_status, u.vip_since, u.vip_level, u.vip_auto_activated,
             COUNT(DISTINCT t.id) AS total_trips,
             COUNT(DISTINCT vr.id) AS total_rewards
             FROM users u
             LEFT JOIN trips t ON t.rider_id = u.id AND t.status = 'completed'
             LEFT JOIN vip_rewards vr ON vr.user_id = u.id
             WHERE u.role = 'rider'`;
    const params = [];
    
    if (statusFilter === 'vip') {
      q += ' AND u.vip_status = TRUE';
    } else if (statusFilter === 'non_vip') {
      q += ' AND u.vip_status = FALSE';
    }
    
    q += ' GROUP BY u.id ORDER BY u.vip_status DESC, u.vip_since DESC LIMIT 200';
    
    const r = await query(q, params);
    res.json({ success: true, users: r.rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/vip/stats - VIP statistics
router.get('/stats', async (req, res, next) => {
  try {
    const vipCount = await query("SELECT COUNT(*) AS count FROM users WHERE vip_status = TRUE");
    const totalRewards = await query('SELECT COUNT(*) AS count FROM vip_rewards');
    const weeklyActivated = await query(
      `SELECT COUNT(*) AS count FROM users WHERE vip_status = TRUE AND vip_auto_activated = TRUE AND vip_since >= NOW() - INTERVAL '7 days'`
    );
    const tripsRes = await query(
      `SELECT COUNT(*) AS count FROM trips t JOIN users u ON u.id = t.rider_id WHERE u.vip_status = TRUE AND t.status = 'completed'`
    );
    
    res.json({
      success: true,
      stats: {
        total_vip_users: parseInt(vipCount.rows[0]?.count || '0', 10),
        total_rewards_given: parseInt(totalRewards.rows[0]?.count || '0', 10),
        vip_activated_this_week: parseInt(weeklyActivated.rows[0]?.count || '0', 10),
        total_vip_trips: parseInt(tripsRes.rows[0]?.count || '0', 10),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/vip/users/:userId/status - Manually activate/deactivate VIP
router.patch(
  '/users/:userId/status',
  [body('vip_status').isBoolean()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { vip_status } = req.body;
      const userId = req.params.userId;
      
      await setVIPStatus(userId, vip_status, req.adminId);
      
      // Send notification if activated
      if (vip_status) {
        await sendVIPActivationNotification(userId).catch(() => {});
      }
      
      const status = await getUserVIPStatus(userId);
      res.json({ success: true, vip: status });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/vip/users/:userId/reward - Manually assign reward
router.post(
  '/users/:userId/reward',
  [
    body('reward_type').isIn(['discount', 'free_trip', 'special_offer']),
    body('reward_value').optional().isFloat({ min: 0 }),
    body('description').optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { reward_type, reward_value, description } = req.body;
      const userId = req.params.userId;
      
      const userRes = await query('SELECT vip_status, vip_level FROM users WHERE id = $1', [userId]);
      if (userRes.rows.length === 0) return res.status(404).json({ success: false, error: 'User not found' });
      if (!userRes.rows[0].vip_status) {
        return res.status(400).json({ success: false, error: 'User is not VIP' });
      }
      
      const rewardId = require('uuid').v4();
      await query(
        `INSERT INTO vip_rewards (id, user_id, reward_type, reward_value, vip_level_at_reward, description)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [rewardId, userId, reward_type, reward_value || 0, userRes.rows[0].vip_level, description || 'Manual reward']
      );
      
      await sendVIPRewardNotification(userId, {
        rewardType: reward_type,
        rewardValue: reward_value || 0,
        description: description || 'You\'ve received a VIP reward!',
      }).catch(() => {});
      
      const rewardRes = await query('SELECT * FROM vip_rewards WHERE id = $1', [rewardId]);
      res.json({ success: true, reward: rewardRes.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/vip/notify - Send custom notification to user
router.post(
  '/notify',
  [
    body('user_id').isUUID(),
    body('title').trim().notEmpty(),
    body('body').trim().notEmpty(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      const { user_id, title, body: bodyText } = req.body;
      
      const result = await sendNotification(user_id, title, bodyText, { type: 'custom' });
      res.json({ success: result.success, ...result });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/vip/auto-activate - Manually trigger auto-activation check
router.post('/auto-activate', async (req, res, next) => {
  try {
    await updateWeeklyTripCounts();
    const activated = await checkAndActivateVIP();
    
    // Send notifications to newly activated users
    for (const user of activated) {
      await sendVIPActivationNotification(user.userId).catch(() => {});
    }
    
    res.json({ success: true, activated_count: activated.length, activated });
  } catch (err) {
    next(err);
  }
});

// GET /api/vip/config - Get VIP configuration
router.get('/config', async (req, res, next) => {
  try {
    const r = await query('SELECT * FROM vip_config WHERE active = TRUE LIMIT 1');
    res.json({ success: true, config: r.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/vip/config - Update VIP configuration
router.patch(
  '/config',
  [
    body('trips_per_week_for_vip').optional().isInt({ min: 1 }),
    body('trips_per_reward').optional().isInt({ min: 1 }),
    body('reward_discount_percentage').optional().isFloat({ min: 0, max: 100 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
      
      const updates = [];
      const values = [];
      let i = 1;
      
      ['trips_per_week_for_vip', 'trips_per_reward', 'reward_discount_percentage'].forEach((field) => {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = $${i++}`);
          values.push(req.body[field]);
        }
      });
      
      if (updates.length === 0) return res.status(400).json({ success: false, error: 'No fields to update' });
      
      values.push(i);
      await query(
        `UPDATE vip_config SET ${updates.join(', ')}, updated_at = NOW() WHERE active = TRUE AND id = (SELECT id FROM vip_config WHERE active = TRUE LIMIT 1)`,
        values.slice(0, -1)
      );
      
      const r = await query('SELECT * FROM vip_config WHERE active = TRUE LIMIT 1');
      res.json({ success: true, config: r.rows[0] });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
