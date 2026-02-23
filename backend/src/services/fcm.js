/**
 * Firebase Cloud Messaging (FCM) Service
 * Sends push notifications for VIP events
 */

const admin = require('firebase-admin');

let fcmInitialized = false;

function initializeFCM() {
  if (fcmInitialized) return;
  
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      console.warn('FCM not configured: FIREBASE_SERVICE_ACCOUNT_PATH not set');
      return;
    }
    
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    fcmInitialized = true;
    console.log('FCM initialized');
  } catch (err) {
    console.warn('FCM initialization failed:', err.message);
  }
}

/**
 * Get FCM tokens for a user
 */
async function getUserFCMTokens(userId) {
  const { query } = require('../db/client');
  const res = await query(
    'SELECT token FROM device_tokens WHERE user_id = $1 AND platform IN ($2, $3)',
    [userId, 'ios', 'android']
  );
  return res.rows.map((r) => r.token);
}

/**
 * Send notification to user
 */
async function sendNotification(userId, title, body, data = {}) {
  if (!fcmInitialized) {
    initializeFCM();
    if (!fcmInitialized) {
      console.warn('FCM not available, skipping notification');
      return { success: false, error: 'FCM not initialized' };
    }
  }
  
  const tokens = await getUserFCMTokens(userId);
  if (tokens.length === 0) {
    return { success: false, error: 'No FCM tokens found' };
  }
  
  const message = {
    notification: { title, body },
    data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
    tokens,
  };
  
  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    
    // Log notification
    const { query } = require('../db/client');
    await query(
      `INSERT INTO vip_notifications (user_id, notification_type, title, body, fcm_token, sent_at, delivered)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)`,
      [userId, data.type || 'custom', title, body, tokens[0] || null, response.successCount > 0]
    );
    
    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('FCM send error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send VIP activation notification
 */
async function sendVIPActivationNotification(userId) {
  return sendNotification(
    userId,
    'Congratulations! You are now a VIP user',
    'Enjoy priority matching, exclusive rewards, and special perks!',
    { type: 'vip_activated', action: 'vip_status' }
  );
}

/**
 * Send VIP reward notification
 */
async function sendVIPRewardNotification(userId, reward) {
  return sendNotification(
    userId,
    'VIP Reward Unlocked!',
    reward.description || `You've earned a reward for completing ${reward.vipLevel} VIP trips!`,
    {
      type: 'reward_unlocked',
      reward_type: reward.rewardType,
      reward_value: String(reward.rewardValue || 0),
      vip_level: String(reward.vipLevel || 0),
    }
  );
}

module.exports = {
  initializeFCM,
  sendNotification,
  sendVIPActivationNotification,
  sendVIPRewardNotification,
  getUserFCMTokens,
};
