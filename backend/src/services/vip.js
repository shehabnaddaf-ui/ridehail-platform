/**
 * VIP System Service
 * - Auto-activation based on weekly trips (10+ trips/week)
 * - Reward tracking (every 5 trips = reward)
 * - Weekly monitoring and status updates
 */

const { query } = require('../db/client');

const TRIPS_PER_WEEK_FOR_VIP = 10;
const TRIPS_PER_REWARD = 5;

/**
 * Get Monday of current week (ISO week)
 */
function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  return new Date(d.setDate(diff));
}

/**
 * Check and auto-activate VIP for users with 10+ trips this week
 */
async function checkAndActivateVIP() {
  const weekStart = getWeekStart();
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  
  // Get config
  const configRes = await query('SELECT trips_per_week_for_vip FROM vip_config WHERE active = TRUE LIMIT 1');
  const tripsThreshold = configRes.rows[0]?.trips_per_week_for_vip || TRIPS_PER_WEEK_FOR_VIP;
  
  // Get users with 10+ trips this week who are not VIP
  const usersRes = await query(
    `SELECT u.id, COUNT(t.id) AS trip_count
     FROM users u
     JOIN trips t ON t.rider_id = u.id
     WHERE u.vip_status = FALSE
       AND t.status = 'completed'
       AND t.completed_at >= $1::date
       AND t.completed_at < ($1::date + INTERVAL '7 days')
     GROUP BY u.id
     HAVING COUNT(t.id) >= $2`,
    [weekStartStr, tripsThreshold]
  );
  
  const activated = [];
  for (const row of usersRes.rows) {
    await query(
      `UPDATE users SET 
        vip_status = TRUE, 
        vip_since = NOW(), 
        vip_auto_activated = TRUE,
        vip_level = 0,
        updated_at = NOW()
       WHERE id = $1`,
      [row.id]
    );
    
    // Update weekly count
    await query(
      `INSERT INTO vip_weekly_counts (user_id, week_start_date, trip_count, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, week_start_date) 
       DO UPDATE SET trip_count = $3, updated_at = NOW()`,
      [row.id, weekStartStr, parseInt(row.trip_count, 10)]
    );
    
    activated.push({ userId: row.id, tripCount: parseInt(row.trip_count, 10) });
  }
  
  return activated;
}

/**
 * Process rewards for VIP users who completed 5 trips
 * Called after trip completion (via trigger or manual)
 */
async function processVIPRewards(tripId, userId) {
  // Check if reward already given (by trigger or previous call)
  const tripRes = await query('SELECT reward_given FROM trips WHERE id = $1', [tripId]);
  if (tripRes.rows.length === 0 || tripRes.rows[0].reward_given) return null;
  
  const userRes = await query('SELECT vip_status, vip_level FROM users WHERE id = $1', [userId]);
  if (userRes.rows.length === 0 || !userRes.rows[0].vip_status) return null;
  
  const vipLevel = userRes.rows[0].vip_level;
  const configRes = await query('SELECT trips_per_reward, reward_discount_percentage FROM vip_config WHERE active = TRUE LIMIT 1');
  const tripsPerReward = configRes.rows[0]?.trips_per_reward || TRIPS_PER_REWARD;
  
  // Check if reward should be given (vip_level is multiple of trips_per_reward)
  if (vipLevel > 0 && vipLevel % tripsPerReward === 0) {
    const tripRes = await query('SELECT fare_amount FROM trips WHERE id = $1', [tripId]);
    const fareAmount = tripRes.rows[0]?.fare_amount || 0;
    const discountPct = configRes.rows[0]?.reward_discount_percentage || 20;
    const rewardValue = Math.round((fareAmount * discountPct / 100) * 100) / 100;
    
    // Record reward
    await query(
      `INSERT INTO vip_rewards (user_id, trip_id, reward_type, reward_value, vip_level_at_reward, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        tripId,
        'discount',
        rewardValue,
        vipLevel,
        `20% discount reward for completing ${tripsPerReward} VIP trips`
      ]
    );
    
    // Mark trip as reward-given
    await query(
      `UPDATE trips SET reward_given = TRUE, reward_type = $1, reward_value = $2 WHERE id = $3`,
      ['discount', rewardValue, tripId]
    );
    
    return {
      rewardType: 'discount',
      rewardValue,
      vipLevel,
      description: `You've earned a ${discountPct}% discount reward!`
    };
  }
  
  return null;
}

/**
 * Update weekly trip counts for all users (for VIP eligibility)
 */
async function updateWeeklyTripCounts() {
  const weekStart = getWeekStart();
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  
  const res = await query(
    `SELECT rider_id, COUNT(*) AS trip_count
     FROM trips
     WHERE status = 'completed'
       AND completed_at >= $1::date
       AND completed_at < ($1::date + INTERVAL '7 days')
     GROUP BY rider_id`,
    [weekStartStr]
  );
  
  for (const row of res.rows) {
    await query(
      `INSERT INTO vip_weekly_counts (user_id, week_start_date, trip_count, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, week_start_date)
       DO UPDATE SET trip_count = $3, updated_at = NOW()`,
      [row.rider_id, weekStartStr, parseInt(row.trip_count, 10)]
    );
  }
  
  return res.rows.length;
}

/**
 * Get VIP status and progress for a user
 */
async function getUserVIPStatus(userId) {
  const userRes = await query(
    `SELECT vip_status, vip_since, vip_level, vip_auto_activated
     FROM users WHERE id = $1`,
    [userId]
  );
  
  if (userRes.rows.length === 0) return null;
  
  const user = userRes.rows[0];
  if (!user.vip_status) {
    // Check weekly count for eligibility
    const weekStart = getWeekStart();
    const weekStartStr = weekStart.toISOString().slice(0, 10);
    const countRes = await query(
      'SELECT trip_count FROM vip_weekly_counts WHERE user_id = $1 AND week_start_date = $2',
      [userId, weekStartStr]
    );
    const tripsThisWeek = countRes.rows[0]?.trip_count || 0;
    const configRes = await query('SELECT trips_per_week_for_vip FROM vip_config WHERE active = TRUE LIMIT 1');
    const tripsNeeded = configRes.rows[0]?.trips_per_week_for_vip || TRIPS_PER_WEEK_FOR_VIP;
    
    return {
      vip_status: false,
      trips_this_week: tripsThisWeek,
      trips_needed_for_vip: tripsNeeded,
      progress_percent: Math.min(100, (tripsThisWeek / tripsNeeded) * 100),
    };
  }
  
  // VIP user: return status and reward progress
  const configRes = await query('SELECT trips_per_reward FROM vip_config WHERE active = TRUE LIMIT 1');
  const tripsPerReward = configRes.rows[0]?.trips_per_reward || TRIPS_PER_REWARD;
  const tripsUntilReward = tripsPerReward - (user.vip_level % tripsPerReward);
  
  const rewardsRes = await query(
    'SELECT COUNT(*) AS count FROM vip_rewards WHERE user_id = $1',
    [userId]
  );
  
  return {
    vip_status: true,
    vip_since: user.vip_since,
    vip_level: user.vip_level,
    auto_activated: user.vip_auto_activated,
    trips_until_next_reward: tripsUntilReward,
    total_rewards: parseInt(rewardsRes.rows[0]?.count || '0', 10),
  };
}

/**
 * Manually activate/deactivate VIP
 */
async function setVIPStatus(userId, vipStatus, adminId = null) {
  if (vipStatus) {
    await query(
      `UPDATE users SET 
        vip_status = TRUE,
        vip_since = COALESCE(vip_since, NOW()),
        vip_activated_by = $1,
        vip_auto_activated = FALSE,
        updated_at = NOW()
       WHERE id = $2`,
      [adminId, userId]
    );
  } else {
    await query(
      `UPDATE users SET 
        vip_status = FALSE,
        vip_level = 0,
        vip_activated_by = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [userId]
    );
  }
  
  return { success: true, vip_status: vipStatus };
}

module.exports = {
  checkAndActivateVIP,
  processVIPRewards,
  updateWeeklyTripCounts,
  getUserVIPStatus,
  setVIPStatus,
  getWeekStart,
};
