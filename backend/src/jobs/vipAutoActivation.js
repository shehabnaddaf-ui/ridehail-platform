/**
 * Scheduled Job: VIP Auto-Activation
 * Runs periodically to check and activate VIP users
 * Can be called via cron or manual trigger
 */

const { updateWeeklyTripCounts, checkAndActivateVIP } = require('../services/vip');
const { sendVIPActivationNotification } = require('../services/fcm');

/**
 * Run VIP auto-activation check
 * Should be called daily (e.g. via cron or scheduled task)
 */
async function runVIPAutoActivation() {
  try {
    console.log('[VIP Job] Starting auto-activation check...');
    
    // Update weekly trip counts
    const updated = await updateWeeklyTripCounts();
    console.log(`[VIP Job] Updated weekly counts for ${updated} users`);
    
    // Check and activate VIP
    const activated = await checkAndActivateVIP();
    console.log(`[VIP Job] Activated ${activated.length} new VIP users`);
    
    // Send notifications
    for (const user of activated) {
      try {
        await sendVIPActivationNotification(user.userId);
        console.log(`[VIP Job] Sent activation notification to user ${user.userId}`);
      } catch (err) {
        console.error(`[VIP Job] Failed to send notification to ${user.userId}:`, err.message);
      }
    }
    
    return {
      success: true,
      updated,
      activated: activated.length,
      activatedUsers: activated,
    };
  } catch (err) {
    console.error('[VIP Job] Error:', err);
    throw err;
  }
}

// If running directly (for testing)
if (require.main === module) {
  runVIPAutoActivation()
    .then((result) => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed:', err);
      process.exit(1);
    });
}

module.exports = { runVIPAutoActivation };
