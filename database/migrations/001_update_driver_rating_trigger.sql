-- Migration: Update driver rating automatically when new rating is added
-- Run after schema.sql

-- Function to recalculate driver rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalculate average rating for the driver
    UPDATE drivers
    SET rating = (
        SELECT COALESCE(AVG(rating), 5.0)
        FROM ratings
        WHERE to_driver_id = NEW.to_driver_id
    ),
    updated_at = NOW()
    WHERE id = NEW.to_driver_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update driver rating after insert
DROP TRIGGER IF EXISTS trigger_update_driver_rating ON ratings;
CREATE TRIGGER trigger_update_driver_rating
AFTER INSERT ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_driver_rating();

-- Also update on driver_ratings table
CREATE OR REPLACE FUNCTION update_driver_rating_from_driver_ratings()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE drivers
    SET rating = (
        SELECT COALESCE(AVG(rating), 5.0)
        FROM driver_ratings
        WHERE driver_id = NEW.driver_id
    ),
    updated_at = NOW()
    WHERE id = NEW.driver_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_driver_rating_from_driver_ratings ON driver_ratings;
CREATE TRIGGER trigger_update_driver_rating_from_driver_ratings
AFTER INSERT ON driver_ratings
FOR EACH ROW
EXECUTE FUNCTION update_driver_rating_from_driver_ratings();
