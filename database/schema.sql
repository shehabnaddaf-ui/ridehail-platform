-- =============================================
-- RideHail - PostgreSQL Database Schema
-- =============================================

-- Extensions (PostGIS optional - use if you need geo queries; we use app-side haversine for matching)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- ENUMS
-- =============================================
CREATE TYPE user_role AS ENUM ('rider', 'driver', 'admin');
CREATE TYPE driver_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE trip_status AS ENUM ('requested', 'accepted', 'driver_arriving', 'in_progress', 'completed', 'cancelled');
CREATE TYPE ride_type AS ENUM ('economy', 'premium', 'xl');
CREATE TYPE payment_method AS ENUM ('cash', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- =============================================
-- USERS (Riders)
-- =============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'rider',
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);

-- =============================================
-- ADMINS
-- =============================================
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'admin',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- OTP / AUTH
-- =============================================
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_phone_expires ON otp_codes(phone, expires_at);

-- =============================================
-- DRIVERS
-- =============================================
CREATE TABLE drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    license_image_url TEXT,
    status driver_status DEFAULT 'pending',
    rating DECIMAL(3,2) DEFAULT 5.0,
    total_trips INTEGER DEFAULT 0,
    is_online BOOLEAN DEFAULT FALSE,
    current_lat DECIMAL(10, 8),
    current_lng DECIMAL(11, 8),
    last_location_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drivers_status_online ON drivers(status, is_online);
CREATE INDEX idx_drivers_location ON drivers(current_lat, current_lng) WHERE is_online = TRUE;

-- =============================================
-- VEHICLES
-- =============================================
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50),
    plate_number VARCHAR(20) UNIQUE NOT NULL,
    ride_types ride_type[] DEFAULT ARRAY['economy']::ride_type[],
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_driver ON vehicles(driver_id);

-- =============================================
-- FARE CONFIGURATION
-- =============================================
CREATE TABLE fare_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_type ride_type NOT NULL UNIQUE,
    base_fare DECIMAL(10, 2) NOT NULL,
    per_km DECIMAL(10, 2) NOT NULL,
    per_minute DECIMAL(10, 2) NOT NULL,
    min_fare DECIMAL(10, 2) NOT NULL,
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIPS
-- =============================================
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rider_id UUID REFERENCES users(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    ride_type ride_type NOT NULL DEFAULT 'economy',
    status trip_status DEFAULT 'requested',
    pickup_lat DECIMAL(10, 8) NOT NULL,
    pickup_lng DECIMAL(11, 8) NOT NULL,
    pickup_address TEXT,
    dropoff_lat DECIMAL(10, 8) NOT NULL,
    dropoff_lng DECIMAL(11, 8) NOT NULL,
    dropoff_address TEXT,
    estimated_distance_km DECIMAL(8, 2),
    estimated_duration_min INTEGER,
    estimated_fare DECIMAL(10, 2),
    final_distance_km DECIMAL(8, 2),
    final_duration_min INTEGER,
    fare_amount DECIMAL(10, 2),
    surge_multiplier DECIMAL(3, 2) DEFAULT 1.0,
    commission_amount DECIMAL(10, 2),
    driver_earnings DECIMAL(10, 2),
    payment_method payment_method,
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    cancel_fee DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trips_rider ON trips(rider_id);
CREATE INDEX idx_trips_driver ON trips(driver_id);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_trips_requested_at ON trips(requested_at);

-- =============================================
-- WALLETS
-- =============================================
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
    balance DECIMAL(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PAYMENTS
-- =============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    stripe_payment_id VARCHAR(255),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status payment_status DEFAULT 'pending',
    payment_method payment_method NOT NULL,
    rider_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_trip ON payments(trip_id);

-- =============================================
-- PAYOUTS (Driver withdrawals)
-- =============================================
CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    stripe_payout_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- RATINGS
-- =============================================
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE UNIQUE,
    from_user_id UUID REFERENCES users(id),
    to_driver_id UUID REFERENCES drivers(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE driver_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id),
    rider_id UUID REFERENCES users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- PROMOTIONS
-- =============================================
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) NOT NULL, -- 'percentage', 'fixed'
    discount_value DECIMAL(10, 2) NOT NULL,
    min_trip_amount DECIMAL(10, 2) DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- CANCELLATION RULES
-- =============================================
CREATE TABLE cancellation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    free_cancel_minutes INTEGER NOT NULL DEFAULT 5,
    cancel_fee DECIMAL(10, 2) NOT NULL DEFAULT 5.0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- COMMISSION CONFIG
-- =============================================
CREATE TABLE commission_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    percentage DECIMAL(5, 2) NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- REFRESH TOKENS
-- =============================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    driver_id UUID REFERENCES drivers(id),
    admin_id UUID REFERENCES admins(id),
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- DEVICE TOKENS (FCM)
-- =============================================
CREATE TABLE device_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    token VARCHAR(500) NOT NULL,
    platform VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TRIGGERS (updated_at)
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER fare_config_updated_at BEFORE UPDATE ON fare_config FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

-- =============================================
-- SEED DATA (optional)
-- =============================================
INSERT INTO fare_config (ride_type, base_fare, per_km, per_minute, min_fare) VALUES
('economy', 2.50, 1.20, 0.25, 5.00),
('premium', 5.00, 2.00, 0.40, 10.00),
('xl', 6.00, 2.50, 0.50, 12.00);

INSERT INTO cancellation_rules (free_cancel_minutes, cancel_fee) VALUES (5, 5.00);
INSERT INTO commission_config (percentage) VALUES (20.00);
