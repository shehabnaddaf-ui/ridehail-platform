-- Migration: Add indexes for efficient pagination
-- Optimizes common list queries

-- Trips pagination
CREATE INDEX IF NOT EXISTS idx_trips_rider_requested_at ON trips(rider_id, requested_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_driver_requested_at ON trips(driver_id, requested_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_status_requested_at ON trips(status, requested_at DESC) WHERE deleted_at IS NULL;

-- Drivers pagination
CREATE INDEX IF NOT EXISTS idx_drivers_status_created_at ON drivers(status, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_online_created_at ON drivers(is_online, created_at DESC) WHERE deleted_at IS NULL;

-- Users pagination
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_vip_created_at ON users(vip_status, created_at DESC) WHERE deleted_at IS NULL;

-- Ratings pagination
CREATE INDEX IF NOT EXISTS idx_ratings_driver_created_at ON ratings(to_driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_user_created_at ON ratings(from_user_id, created_at DESC);
