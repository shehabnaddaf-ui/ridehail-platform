# VIP Customer System - Complete Documentation

## Overview

The VIP system automatically rewards frequent riders and provides them with priority service, exclusive UI, and rewards. It's fully automated but also manageable from the Admin Dashboard.

---

## How It Works

### 1. Auto-Activation

**Trigger**: User completes **10 or more trips in a single week** (Monday-Sunday).

**Process**:
1. Weekly job runs (daily recommended) to count trips per user
2. Users with 10+ trips are automatically marked as VIP
3. `vip_status` = TRUE, `vip_since` = NOW(), `vip_auto_activated` = TRUE
4. Push notification sent: "Congratulations! You are now a VIP user."

**Edge Cases**:
- If user loses internet: Weekly counts are stored; activation happens when job runs
- If user already VIP: No change
- Manual activation: Admin can override; `vip_auto_activated` = FALSE

---

### 2. VIP Priority Matching

**How it works**:
- When VIP user requests ride, `findNearestDrivers()` receives `riderId`
- Checks `users.vip_status` for that rider
- If VIP: Wider distance tolerance (1.0km vs 0.5km) for rating tie-break
- Result: VIP requests get matched to closer/higher-rated drivers first

**Code**: `backend/src/services/matching.js` - `findNearestDrivers()` accepts `riderId` parameter

---

### 3. Reward System

**Trigger**: VIP user completes **5 trips** (configurable via `vip_config.trips_per_reward`).

**Process**:
1. `vip_level` increments on each completed trip (via trigger)
2. When `vip_level % 5 === 0`: Reward is triggered
3. Reward type: **20% discount** (configurable)
4. Reward value = `fare_amount * discount_percentage / 100`
5. Recorded in `vip_rewards` table
6. Push notification: "You've earned a reward for completing 5 VIP trips!"

**Reward Types** (future):
- `discount`: Percentage off next trip
- `free_trip`: Free ride (up to X amount)
- `special_offer`: Custom offer

**Prevention of Duplication**:
- `trips.reward_given` flag prevents double rewards
- Trigger checks `reward_given = FALSE` before processing
- `vip_level` increments only once per trip

---

### 4. VIP UI (Rider App)

**Visual Changes**:
- **VIP Badge**: Gold/yellow badge "VIP" shown on home screen
- **VIP Colors**: Primary button changes to gold (`#fbbf24`) with border
- **Button Text**: "✨ Book VIP Ride" instead of "Book a ride"
- **Progress Bar**: Shows trips until next reward (for VIP) or progress to VIP (for non-VIP)
- **VIP Screen**: Dedicated screen showing status, benefits, rewards history

**Components**:
- `VIPBadge`: Gold badge component
- `VIPProgress`: Progress bar for VIP/reward status
- `VIPScreen`: Full VIP status and rewards page

**Real-time Updates**:
- Socket event `vip_reward_unlocked` triggers alert and refresh
- VIP status refreshed after trip completion

---

### 5. Push Notifications (FCM)

**Setup**:
- Requires `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`
- Points to Firebase service account JSON file
- Initialized on server start

**Notifications Sent**:
1. **VIP Activation**: "Congratulations! You are now a VIP user."
2. **Reward Unlocked**: "You've earned a reward for completing 5 VIP trips!"
3. **Custom**: Admin can send custom notifications

**Logging**: All notifications logged in `vip_notifications` table with delivery status.

---

## Database Schema

### Users Table (Extended)
```sql
vip_status BOOLEAN DEFAULT FALSE
vip_since TIMESTAMPTZ
vip_level INTEGER DEFAULT 0  -- tracks trips for rewards
vip_activated_by UUID  -- admin who manually activated (if manual)
vip_auto_activated BOOLEAN DEFAULT FALSE
```

### Trips Table (Extended)
```sql
reward_given BOOLEAN DEFAULT FALSE
reward_type VARCHAR(50)  -- 'discount', 'free_trip', 'special_offer'
reward_value DECIMAL(10, 2)
```

### New Tables

**vip_rewards**: History of all rewards given
- `user_id`, `trip_id`, `reward_type`, `reward_value`, `vip_level_at_reward`, `given_at`, `used_at`

**vip_weekly_counts**: Weekly trip counts for auto-activation
- `user_id`, `week_start_date`, `trip_count`

**vip_notifications**: Log of all VIP notifications
- `user_id`, `notification_type`, `title`, `body`, `sent_at`, `delivered`

**vip_config**: Configuration (trips per week, trips per reward, discount %)
- `trips_per_week_for_vip`, `trips_per_reward`, `reward_discount_percentage`

---

## API Endpoints

### User Endpoints
- `GET /api/vip/status` - Get current user's VIP status and progress
- `GET /api/vip/rewards` - Get user's reward history

### Admin Endpoints
- `GET /api/vip/users` - List all users with VIP status (filter: all/vip/non_vip)
- `GET /api/vip/stats` - VIP statistics (total VIP, rewards, trips)
- `PATCH /api/vip/users/:userId/status` - Manually activate/deactivate VIP
- `POST /api/vip/users/:userId/reward` - Manually assign reward
- `POST /api/vip/notify` - Send custom notification
- `POST /api/vip/auto-activate` - Manually trigger auto-activation check
- `GET /api/vip/config` - Get VIP configuration
- `PATCH /api/vip/config` - Update VIP configuration

---

## Scheduled Jobs

### Auto-Activation Job

**File**: `backend/src/jobs/vipAutoActivation.js`

**What it does**:
1. Updates weekly trip counts for all users
2. Checks for users with 10+ trips this week
3. Activates VIP for eligible users
4. Sends activation notifications

**How to run**:
```bash
# Manual trigger
node backend/src/jobs/vipAutoActivation.js

# Or via cron (daily at 2 AM)
0 2 * * * cd /path/to/backend && node src/jobs/vipAutoActivation.js
```

**Or via API**:
```bash
POST /api/vip/auto-activate
```

---

## Edge Cases Handled

### 1. Lost Internet
- **Weekly counts**: Stored in DB; job processes when run
- **VIP activation**: Happens on next job run
- **Rewards**: Triggered on trip completion; if offline, processed when back online
- **Notifications**: Queued; sent when FCM available

### 2. Reward Duplication Prevention
- `trips.reward_given` flag checked before reward
- Trigger only fires once per trip (when status changes to 'completed')
- `vip_level` increments atomically

### 3. Manual Override
- Admin can activate/deactivate VIP manually
- Manual activation sets `vip_auto_activated = FALSE`
- Auto-activation won't override manual deactivation

### 4. Multiple Trips Same Week
- Weekly counts tracked per user per week
- Count resets each Monday
- User needs 10 trips in same week to activate

### 5. VIP Level Reset
- If VIP deactivated: `vip_level` resets to 0
- If reactivated: Level starts from 0 (or can be preserved if needed)

---

## Testing

### Unit Tests (to implement)

**VIP Service Tests**:
- `checkAndActivateVIP()`: Should activate users with 10+ trips
- `processVIPRewards()`: Should give reward at vip_level 5, 10, 15...
- `getUserVIPStatus()`: Should return correct status and progress
- `setVIPStatus()`: Should update status correctly

**Matching Tests**:
- VIP users should get priority (closer drivers)
- Non-VIP users should get standard matching

**Edge Cases**:
- User with 9 trips (should not activate)
- User with 10 trips (should activate)
- VIP user completes 5th trip (should get reward)
- VIP user completes 6th trip (should not get reward)
- Manual activation then auto-activation (should not duplicate)

---

## Configuration

### VIP Config (vip_config table)

| Field | Default | Description |
|-------|---------|-------------|
| `trips_per_week_for_vip` | 10 | Trips needed to become VIP |
| `trips_per_reward` | 5 | Trips needed for each reward |
| `reward_discount_percentage` | 20 | Discount percentage for rewards |

**Update via API**:
```bash
PATCH /api/vip/config
{
  "trips_per_week_for_vip": 10,
  "trips_per_reward": 5,
  "reward_discount_percentage": 20
}
```

---

## Admin Dashboard Features

### VIP Management Page

**Features**:
- **Statistics**: Total VIP users, rewards given, VIP trips, activated this week
- **User List**: All users with VIP status, level, trips, rewards
- **Filters**: All / VIP / Non-VIP
- **Actions**:
  - Toggle VIP status (activate/deactivate)
  - Assign manual reward
  - Run auto-activation check
- **Visual Indicators**: Gold badge for VIP users

---

## Rider App Features

### VIP Detection
- App checks VIP status on login and after trip completion
- `VIPContext` provides `vipStatus` to all screens
- Real-time updates via Socket.io

### VIP UI
- **Home Screen**: VIP badge, gold button, progress bar
- **VIP Screen**: Full status, benefits, rewards history
- **Trip Screen**: VIP indicators (if applicable)

### Notifications
- FCM push notifications for activation and rewards
- In-app alerts for reward unlocks
- Background notifications when app closed

---

## Deployment Checklist

- [ ] Run `database/schema_vip.sql` on production DB
- [ ] Set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`
- [ ] Set up cron job for auto-activation (daily)
- [ ] Test VIP activation with test user
- [ ] Test reward system (complete 5 trips)
- [ ] Test push notifications
- [ ] Configure VIP config values
- [ ] Train admins on VIP management

---

## Summary

The VIP system is **fully automated** but **fully manageable**:
- ✅ Auto-activates users with 10+ trips/week
- ✅ Gives priority matching to VIP users
- ✅ Rewards every 5 trips (20% discount)
- ✅ Sends push notifications
- ✅ Admin can override everything
- ✅ Works offline (syncs when back online)
- ✅ Prevents duplication and edge cases

The system integrates seamlessly into RideHail and enhances the experience for frequent riders while remaining transparent and fair.
