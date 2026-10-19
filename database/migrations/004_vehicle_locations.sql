-- Additive migration: existing bookings and accounts remain intact.
CREATE TABLE IF NOT EXISTS locations (
  location_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  city VARCHAR(80) NOT NULL,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(240) NOT NULL,
  UNIQUE(city,name)
);
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON locations FROM PUBLIC;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON locations FROM anon; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON locations FROM authenticated; END IF;
END $$;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS location_id BIGINT REFERENCES locations(location_id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location_id BIGINT REFERENCES locations(location_id);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_location_label TEXT;
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles(location_id,status,vehicle_id);
CREATE INDEX IF NOT EXISTS idx_booking_location ON bookings(pickup_location_id,booking_status);

CREATE OR REPLACE FUNCTION protect_vehicle_location() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.revision := OLD.revision + 1;
  -- First-time assignment of a legacy unit does not rewrite historical bookings.
  IF OLD.location_id IS NOT NULL AND NEW.location_id IS DISTINCT FROM OLD.location_id AND EXISTS (
    SELECT 1 FROM bookings WHERE vehicle_id=OLD.vehicle_id
      AND booking_status IN ('PENDING','APPROVED')
      AND dropoff_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date
  ) THEN
    RAISE EXCEPTION 'A vehicle with upcoming or active reservations cannot change pickup hubs.' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vehicle_location_guard ON vehicles;
CREATE TRIGGER vehicle_location_guard BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION protect_vehicle_location();

CREATE OR REPLACE FUNCTION protect_booking_location() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE actual_location BIGINT; location_label TEXT;
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id OR NEW.pickup_location_id IS DISTINCT FROM OLD.pickup_location_id OR NEW.pickup_location_label IS DISTINCT FROM OLD.pickup_location_label THEN
      RAISE EXCEPTION 'The reserved vehicle and pickup hub cannot be changed.' USING ERRCODE='23514';
    END IF;
    RETURN NEW;
  END IF;
  SELECT location_id INTO actual_location FROM vehicles WHERE vehicle_id=NEW.vehicle_id FOR UPDATE;
  IF actual_location IS NULL OR NEW.pickup_location_id IS DISTINCT FROM actual_location THEN
    RAISE EXCEPTION 'Choose the vehicle at its assigned pickup hub.' USING ERRCODE='23514';
  END IF;
  SELECT city || ' · ' || name || ' · ' || address INTO location_label FROM locations WHERE location_id=actual_location;
  NEW.pickup_location_label := location_label;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS booking_location_guard ON bookings;
CREATE TRIGGER booking_location_guard BEFORE INSERT OR UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION protect_booking_location();
REVOKE EXECUTE ON FUNCTION protect_vehicle_location(),protect_booking_location() FROM PUBLIC;
