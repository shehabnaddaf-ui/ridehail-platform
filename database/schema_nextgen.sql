-- =============================================
-- RideHail Next-Gen — Trust, Safety, Zones, Fatigue, Disputes
-- Run after schema.sql
-- =============================================

-- =============================================
-- TRUST SCORES (driver composite: driving, cancellation, feedback)
-- =============================================
CREATE TABLE IF NOT EXISTS driver_trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    overall_score DECIMAL(3,2) NOT NULL DEFAULT 5.0 CHECK (overall_score >= 0 AND overall_score <= 5),
    driving_behavior_score DECIMAL(3,2) DEFAULT 5.0,
    cancellation_behavior_score DECIMAL(3,2) DEFAULT 5.0,
    rider_feedback_score DECIMAL(3,2) DEFAULT 5.0,
    trip_count_for_score INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_trust_driver ON driver_trust_scores(driver_id);

-- Backfill from drivers.rating
INSERT INTO driver_trust_scores (driver_id, overall_score, rider_feedback_score, trip_count_for_score)
SELECT id, rating, rating, total_trips FROM drivers
ON CONFLICT (driver_id) DO NOTHING;

-- =============================================
-- SAFETY: Trip sharing & emergency
-- =============================================
CREATE TABLE IF NOT EXISTS trip_share_links (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    token VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- 'emergency', 'route_deviation', 'share_created'
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_events_trip ON safety_events(trip_id);
CREATE INDEX IF NOT EXISTS idx_safety_events_type ON safety_events(event_type);

-- =============================================
-- SMART ZONES (high demand areas for drivers)
-- =============================================
CREATE TABLE IF NOT EXISTS smart_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius_km DECIMAL(6, 2) DEFAULT 2.0,
    demand_level VARCHAR(20) DEFAULT 'high', -- 'low', 'medium', 'high', 'surge'
    message TEXT, -- e.g. "High demand for ~45 min"
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_zones_active ON smart_zones(active) WHERE active = TRUE;

-- =============================================
-- DRIVER SESSIONS (for fatigue detection)
-- =============================================
CREATE TABLE IF NOT EXISTS driver_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_trips INTEGER DEFAULT 0,
    rest_suggested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_sessions_driver_active ON driver_sessions(driver_id) WHERE ended_at IS NULL;

-- =============================================
-- DISPUTES (rider or driver)
-- =============================================
CREATE TYPE dispute_status AS ENUM ('open', 'in_review', 'resolved', 'rejected');
CREATE TYPE dispute_side AS ENUM ('rider', 'driver');

CREATE TABLE IF NOT EXISTS disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    raised_by dispute_side NOT NULL,
    rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status dispute_status DEFAULT 'open',
    ai_suggestion JSONB, -- e.g. { "suggested_outcome": "refund_50", "confidence": 0.8 }
    resolution_notes TEXT,
    resolved_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_trip ON disputes(trip_id);

-- =============================================
-- FRAUD SIGNALS (platform intelligence)
-- =============================================
CREATE TABLE IF NOT EXISTS fraud_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL, -- 'rider', 'driver', 'trip'
    entity_id UUID NOT NULL,
    signal_type VARCHAR(50) NOT NULL, -- 'unusual_cancel', 'route_anomaly', 'payment_risk'
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    payload JSONB DEFAULT '{}',
    reviewed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_entity ON fraud_signals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_fraud_signals_reviewed ON fraud_signals(reviewed) WHERE reviewed = FALSE;

-- =============================================
-- EMOTIONAL INDICATORS (admin live map)
-- Stored as aggregated snapshots or real-time aggregates
-- =============================================
CREATE TABLE IF NOT EXISTS zone_emotional_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_name VARCHAR(100),
    center_lat DECIMAL(10, 8),
    center_lng DECIMAL(11, 8),
    rider_frustration_score DECIMAL(5,2), -- e.g. avg wait, cancel rate
    driver_stress_score DECIMAL(5,2),     -- e.g. density, earnings
    snapshot_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER PREFERENCES (default ride type, notifications)
-- =============================================
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    default_ride_type ride_type DEFAULT 'economy',
    notification_trip_updates BOOLEAN DEFAULT TRUE,
    notification_promos BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_driver_trust_from_rating()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO driver_trust_scores (driver_id, overall_score, rider_feedback_score, trip_count_for_score, updated_at)
    VALUES (NEW.to_driver_id, NEW.rating::DECIMAL, NEW.rating::DECIMAL, 1, NOW())
    ON CONFLICT (driver_id) DO UPDATE SET
        rider_feedback_score = (SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE to_driver_id = NEW.to_driver_id),
        overall_score = (SELECT AVG(rating)::DECIMAL(3,2) FROM ratings WHERE to_driver_id = NEW.to_driver_id),
        trip_count_for_score = (SELECT COUNT(*) FROM ratings WHERE to_driver_id = NEW.to_driver_id),
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_rating_trust ON ratings;
CREATE TRIGGER trigger_rating_trust AFTER INSERT ON ratings
FOR EACH ROW EXECUTE PROCEDURE update_driver_trust_from_rating();
