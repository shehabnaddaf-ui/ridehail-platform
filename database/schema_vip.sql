-- =============================================
-- VIP Customer System - Database Schema
-- Run after schema.sql
-- =============================================

-- =============================================
-- VIP STATUS IN USERS TABLE
-- =============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_status BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_since TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0; -- tracks trips for rewards (every 5 trips = reward)
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_activated_by UUID REFERENCES admins(id) ON DELETE SET NULL; -- manual activation
ALTER TABLE users ADD COLUMN IF NOT EXISTS vip_auto_activated BOOLEAN DEFAULT FALSE; -- true if auto-activated

CREATE INDEX IF NOT EXISTS idx_users_vip_status ON users(vip_status) WHERE vip_status = TRUE;
CREATE INDEX IF NOT EXISTS idx_users_vip_level ON users(vip_level) WHERE vip_status = TRUE;

-- =============================================
-- REWARDS TRACKING IN TRIPS TABLE
-- =============================================
ALTER TABLE trips ADD COLUMN IF NOT EXISTS reward_given BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50); -- 'discount', 'free_trip', 'special_offer'
ALTER TABLE trips ADD COLUMN IF NOT EXISTS reward_value DECIMAL(10, 2); -- discount amount or 0 for free trip

CREATE INDEX IF NOT EXISTS idx_trips_reward_given ON trips(reward_given) WHERE reward_given = TRUE;

-- =============================================
-- VIP REWARDS HISTORY
-- =============================================
CREATE TABLE IF NOT EXISTS vip_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    reward_type VARCHAR(50) NOT NULL, -- 'discount', 'free_trip', 'special_offer'
    reward_value DECIMAL(10, 2),
    description TEXT,
    vip_level_at_reward INTEGER NOT NULL, -- vip_level when reward was given
    given_at TIMESTAMPTZ DEFAULT NOW(),
    used_at TIMESTAMPTZ, -- when reward was used (if applicable)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vip_rewards_user ON vip_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_rewards_given ON vip_rewards(given_at);

-- =============================================
-- VIP WEEKLY TRIP COUNTS (for auto-activation)
-- =============================================
CREATE TABLE IF NOT EXISTS vip_weekly_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL, -- Monday of the week
    trip_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_vip_weekly_user_week ON vip_weekly_counts(user_id, week_start_date);

-- =============================================
-- VIP NOTIFICATIONS LOG
-- =============================================
CREATE TABLE IF NOT EXISTS vip_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'vip_activated', 'reward_unlocked', 'custom'
    title TEXT,
    body TEXT,
    fcm_token VARCHAR(500),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vip_notifications_user ON vip_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_vip_notifications_sent ON vip_notifications(sent_at);

-- =============================================
-- VIP CONFIGURATION
-- =============================================
CREATE TABLE IF NOT EXISTS vip_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trips_per_week_for_vip INTEGER DEFAULT 10,
    trips_per_reward INTEGER DEFAULT 5,
    reward_discount_percentage DECIMAL(5, 2) DEFAULT 20.00, -- 20% discount
    reward_free_trip_threshold INTEGER DEFAULT 10, -- every 10 rewards = free trip
    active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config
INSERT INTO vip_config (trips_per_week_for_vip, trips_per_reward, reward_discount_percentage, active)
VALUES (10, 5, 20.00, TRUE)
ON CONFLICT DO NOTHING;

-- =============================================
-- TRIGGER: Update vip_level when trip completed (VIP users only)
-- =============================================
CREATE OR REPLACE FUNCTION update_vip_level_on_trip_complete()
RETURNS TRIGGER AS $$
DECLARE
    user_vip_status BOOLEAN;
    current_vip_level INTEGER;
    new_vip_level INTEGER;
    reward_config RECORD;
BEGIN
    -- Check if user is VIP
    SELECT vip_status INTO user_vip_status FROM users WHERE id = NEW.rider_id;
    
    IF user_vip_status AND NEW.status = 'completed' AND NEW.reward_given = FALSE THEN
        -- Get current vip_level
        SELECT vip_level INTO current_vip_level FROM users WHERE id = NEW.rider_id;
        
        -- Increment vip_level
        new_vip_level := current_vip_level + 1;
        UPDATE users SET vip_level = new_vip_level WHERE id = NEW.rider_id;
        
        -- Check if reward should be given (every 5 trips)
        SELECT trips_per_reward INTO reward_config FROM vip_config WHERE active = TRUE LIMIT 1;
        
        IF reward_config.trips_per_reward > 0 AND new_vip_level % reward_config.trips_per_reward = 0 THEN
            -- Mark trip as reward-given (will be processed by VIP service)
            UPDATE trips SET reward_given = TRUE WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_vip_level_on_trip_complete ON trips;
CREATE TRIGGER trigger_vip_level_on_trip_complete
AFTER UPDATE ON trips
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE PROCEDURE update_vip_level_on_trip_complete();
