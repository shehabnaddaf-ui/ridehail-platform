-- Migration: Add request ID tracking for debugging
-- Adds a request_id column to trips for correlation

ALTER TABLE trips ADD COLUMN IF NOT EXISTS request_id UUID DEFAULT uuid_generate_v4();
CREATE INDEX IF NOT EXISTS idx_trips_request_id ON trips(request_id);

-- Add request tracking table for audit
CREATE TABLE IF NOT EXISTS request_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL,
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    user_id UUID,
    driver_id UUID,
    admin_id UUID,
    ip_address INET,
    user_agent TEXT,
    status_code INTEGER,
    duration_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_logs_request_id ON request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_user_id ON request_logs(user_id);
