-- Migration: Add blocking system for users and drivers
-- Run after main schemas

-- Add blocking fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS block_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_is_blocked ON users(is_blocked) WHERE is_blocked = TRUE;

-- Add blocking fields to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS blocked_by UUID REFERENCES admins(id) ON DELETE SET NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS block_reason TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS id_photo_url TEXT;

CREATE INDEX IF NOT EXISTS idx_drivers_is_blocked ON drivers(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_drivers_status_blocked ON drivers(status, is_blocked);

-- Add photo_url to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Update driver login to check blocked status
-- This will be enforced in the application layer

-- Add trigger to set driver offline when blocked
CREATE OR REPLACE FUNCTION set_driver_offline_on_block()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_blocked = TRUE AND OLD.is_blocked = FALSE THEN
        NEW.is_online = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_driver_offline_on_block ON drivers;
CREATE TRIGGER trigger_set_driver_offline_on_block
BEFORE UPDATE ON drivers
FOR EACH ROW
WHEN (NEW.is_blocked IS DISTINCT FROM OLD.is_blocked)
EXECUTE FUNCTION set_driver_offline_on_block();

-- Comments
COMMENT ON COLUMN users.is_blocked IS 'Whether the user account is blocked by admin';
COMMENT ON COLUMN users.blocked_at IS 'Timestamp when user was blocked';
COMMENT ON COLUMN users.blocked_by IS 'Admin who blocked the user';
COMMENT ON COLUMN users.block_reason IS 'Reason for blocking';

COMMENT ON COLUMN drivers.is_blocked IS 'Whether the driver account is blocked by admin';
COMMENT ON COLUMN drivers.blocked_at IS 'Timestamp when driver was blocked';
COMMENT ON COLUMN drivers.blocked_by IS 'Admin who blocked the driver';
COMMENT ON COLUMN drivers.block_reason IS 'Reason for blocking';
COMMENT ON COLUMN drivers.rejection_reason IS 'Reason for application rejection';
