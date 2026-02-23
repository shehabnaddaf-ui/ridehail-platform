-- =============================================
-- Syria-First Additions: Trust Clusters, Cash, Crisis, Risk, Safe Arrival
-- Run after schema.sql and schema_nextgen.sql
-- =============================================

-- =============================================
-- LOCALE / LANGUAGE (Arabic-first)
-- =============================================
CREATE TABLE IF NOT EXISTS app_locale_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value_ar TEXT,
    value_en TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- NEIGHBORHOOD / TRUST CLUSTERS
-- =============================================
CREATE TABLE IF NOT EXISTS neighborhoods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(150),
    name_en VARCHAR(150),
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius_km DECIMAL(6, 2) DEFAULT 2.0,
    city VARCHAR(100),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_neighborhoods_active ON neighborhoods(active) WHERE active = TRUE;

-- =============================================
-- RIDER TRUST PROFILE (riders also have trust)
-- =============================================
CREATE TABLE IF NOT EXISTS rider_trust_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    overall_score DECIMAL(3,2) NOT NULL DEFAULT 5.0 CHECK (overall_score >= 0 AND overall_score <= 5),
    completion_rate DECIMAL(5,2) DEFAULT 100.0,
    no_show_count INTEGER DEFAULT 0,
    driver_feedback_score DECIMAL(3,2) DEFAULT 5.0,
    trip_count_for_score INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rider_trust_user ON rider_trust_scores(user_id);

-- =============================================
-- TRUSTED DRIVER PROGRAM (verified tier)
-- =============================================
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_trusted_driver BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS trusted_verified_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_trusted ON drivers(is_trusted_driver) WHERE is_trusted_driver = TRUE;

-- =============================================
-- SAFE PICKUP POINTS (suggested safe/common spots)
-- =============================================
CREATE TABLE IF NOT EXISTS safe_pickup_points (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
    name_ar VARCHAR(150),
    name_en VARCHAR(150),
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    address_text TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safe_pickup_neighborhood ON safe_pickup_points(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_safe_pickup_active ON safe_pickup_points(is_active) WHERE is_active = TRUE;

-- =============================================
-- SAFE ARRIVAL CONFIRMATION
-- =============================================
ALTER TABLE trips ADD COLUMN IF NOT EXISTS safe_arrival_confirmed_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS safe_arrival_reminder_sent_at TIMESTAMPTZ;

-- =============================================
-- CASH RECONCILIATION (driver cash tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS trip_cash_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    expected_amount DECIMAL(10, 2) NOT NULL,
    collected_amount DECIMAL(10, 2),
    confirmed_at TIMESTAMPTZ,
    reconciled_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_cash_driver ON trip_cash_records(driver_id);
CREATE INDEX IF NOT EXISTS idx_trip_cash_confirmed ON trip_cash_records(confirmed_at) WHERE confirmed_at IS NOT NULL;

-- =============================================
-- DRIVER DAILY MINIMUM / INCENTIVES
-- =============================================
CREATE TABLE IF NOT EXISTS driver_daily_guarantee (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    date_ date NOT NULL,
    trips_completed INTEGER DEFAULT 0,
    earnings_cash DECIMAL(10, 2) DEFAULT 0,
    minimum_guarantee DECIMAL(10, 2),
    top_up_paid DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(driver_id, date_)
);

CREATE INDEX IF NOT EXISTS idx_driver_daily_driver ON driver_daily_guarantee(driver_id);

-- =============================================
-- RISK ZONES (crisis / security / weather)
-- =============================================
CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high', 'avoid');
CREATE TABLE IF NOT EXISTS risk_zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(150),
    name_en VARCHAR(150),
    center_lat DECIMAL(10, 8) NOT NULL,
    center_lng DECIMAL(11, 8) NOT NULL,
    radius_km DECIMAL(6, 2) DEFAULT 2.0,
    risk_level risk_level NOT NULL DEFAULT 'medium',
    reason TEXT,
    active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_zones_active ON risk_zones(active) WHERE active = TRUE;

-- =============================================
-- CRISIS MODE (platform-wide or per city)
-- =============================================
CREATE TABLE IF NOT EXISTS crisis_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_ar VARCHAR(150),
    name_en VARCHAR(150),
    scope VARCHAR(50) NOT NULL DEFAULT 'zone', -- 'zone', 'city', 'platform'
    zone_or_city_id VARCHAR(100),
    message_ar TEXT,
    message_en TEXT,
    rider_advice_ar TEXT,
    rider_advice_en TEXT,
    driver_advice_ar TEXT,
    driver_advice_en TEXT,
    allow_new_rides BOOLEAN DEFAULT TRUE,
    active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crisis_active ON crisis_events(active) WHERE active = TRUE;

-- =============================================
-- RIDE FOR FAMILY (booker != rider)
-- =============================================
ALTER TABLE trips ADD COLUMN IF NOT EXISTS booked_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS rider_phone VARCHAR(20);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS rider_name_for_display VARCHAR(255);

-- =============================================
-- SILENT EMERGENCY (already in safety_events; add type)
-- =============================================
-- safety_events.event_type: 'silent_emergency' | 'emergency' | 'route_deviation' | 'share_created'

-- =============================================
-- PRICE LOCK (trip level)
-- =============================================
ALTER TABLE trips ADD COLUMN IF NOT EXISTS fare_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS fare_locked_at TIMESTAMPTZ;

-- =============================================
-- LOW BANDWIDTH / PREFERENCES
-- =============================================
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS low_bandwidth_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS locale VARCHAR(10) DEFAULT 'ar';
