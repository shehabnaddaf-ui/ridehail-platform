-- Migration: Add soft delete support for audit trail
-- Adds deleted_at column to key tables

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_drivers_deleted_at ON drivers(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_trips_deleted_at ON trips(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_admins_deleted_at ON admins(deleted_at) WHERE deleted_at IS NULL;

-- Update queries should filter by deleted_at IS NULL
-- Example: SELECT * FROM users WHERE deleted_at IS NULL
