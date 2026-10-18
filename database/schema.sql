-- Run this file in the Supabase SQL Editor.
CREATE TABLE users (user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,name VARCHAR(100) NOT NULL,email VARCHAR(150) NOT NULL UNIQUE,password_hash VARCHAR(255) NOT NULL,phone VARCHAR(20),role VARCHAR(10) NOT NULL DEFAULT 'CUSTOMER' CHECK(role IN ('CUSTOMER','ADMIN')),created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE driving_licenses (license_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id BIGINT NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,license_number VARCHAR(60) NOT NULL UNIQUE,issue_date DATE NOT NULL,expiry_date DATE NOT NULL,license_status VARCHAR(12) DEFAULT 'VALID' CHECK(license_status IN ('VALID','EXPIRED','SUSPENDED')),CHECK(expiry_date>issue_date));
CREATE TABLE vehicles (vehicle_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,vehicle_number VARCHAR(30) NOT NULL UNIQUE,brand VARCHAR(60) NOT NULL,model VARCHAR(80) NOT NULL,vehicle_type VARCHAR(4) NOT NULL CHECK(vehicle_type IN ('CAR','BIKE')),year SMALLINT NOT NULL,fuel_type VARCHAR(10) NOT NULL CHECK(fuel_type IN ('PETROL','DIESEL','ELECTRIC','HYBRID')),transmission VARCHAR(10) NOT NULL CHECK(transmission IN ('MANUAL','AUTOMATIC')),price_per_day NUMERIC(10,2) NOT NULL CHECK(price_per_day>0),status VARCHAR(12) NOT NULL DEFAULT 'AVAILABLE' CHECK(status IN ('AVAILABLE','MAINTENANCE','RETIRED')),created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE vehicle_images (image_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,vehicle_id BIGINT NOT NULL REFERENCES vehicles(vehicle_id) ON DELETE CASCADE,image_url VARCHAR(500) NOT NULL);
CREATE TABLE bookings (booking_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(user_id),vehicle_id BIGINT NOT NULL REFERENCES vehicles(vehicle_id),pickup_date DATE NOT NULL,dropoff_date DATE NOT NULL,booking_date TIMESTAMPTZ DEFAULT NOW(),total_amount NUMERIC(10,2) NOT NULL CHECK(total_amount>=0),booking_status VARCHAR(10) DEFAULT 'PENDING' CHECK(booking_status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),CHECK(dropoff_date>pickup_date));
CREATE INDEX idx_booking_lookup ON bookings(vehicle_id,booking_status,pickup_date,dropoff_date);
CREATE TABLE payments (payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(booking_id),amount NUMERIC(10,2) NOT NULL CHECK(amount>=0),payment_date TIMESTAMPTZ DEFAULT NOW(),payment_method VARCHAR(4) NOT NULL CHECK(payment_method IN ('CARD','UPI','CASH')),payment_status VARCHAR(10) NOT NULL DEFAULT 'PENDING' CHECK(payment_status IN ('PENDING','SUCCESS','FAILED','REFUNDED')),transaction_reference VARCHAR(80) UNIQUE);
CREATE TABLE maintenance (maintenance_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,vehicle_id BIGINT NOT NULL REFERENCES vehicles(vehicle_id),maintenance_type VARCHAR(100) NOT NULL,description TEXT,start_date DATE NOT NULL,end_date DATE,cost NUMERIC(10,2) DEFAULT 0,maintenance_status VARCHAR(12) DEFAULT 'SCHEDULED' CHECK(maintenance_status IN ('SCHEDULED','IN_PROGRESS','COMPLETED')),CHECK(end_date IS NULL OR end_date>=start_date));
CREATE INDEX idx_maintenance_lookup ON maintenance(vehicle_id,maintenance_status,start_date);
CREATE TABLE trip_details (trip_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,booking_id BIGINT NOT NULL UNIQUE REFERENCES bookings(booking_id) ON DELETE CASCADE,destination VARCHAR(160) NOT NULL,distance_km NUMERIC(8,2),estimated_fuel_cost NUMERIC(10,2) DEFAULT 0,estimated_trip_cost NUMERIC(10,2) DEFAULT 0);
CREATE TABLE reviews (review_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,user_id BIGINT NOT NULL REFERENCES users(user_id),vehicle_id BIGINT NOT NULL REFERENCES vehicles(vehicle_id),rating SMALLINT NOT NULL CHECK(rating BETWEEN 1 AND 5),comment TEXT,review_date TIMESTAMPTZ DEFAULT NOW(),UNIQUE(user_id,vehicle_id));

CREATE VIEW booking_details AS SELECT b.booking_id,b.user_id,u.name AS customer_name,u.email,v.brand,v.model,v.vehicle_number,b.pickup_date,b.dropoff_date,b.total_amount,b.booking_status,p.payment_status FROM bookings b JOIN users u ON u.user_id=b.user_id JOIN vehicles v ON v.vehicle_id=b.vehicle_id LEFT JOIN payments p ON p.booking_id=b.booking_id;
CREATE VIEW vehicle_utilization AS SELECT v.vehicle_id,CONCAT(v.brand,' ',v.model) AS vehicle,v.vehicle_type,COUNT(b.booking_id)::int AS booking_count,COALESCE(SUM(CASE WHEN b.booking_status='APPROVED' THEN b.dropoff_date-b.pickup_date ELSE 0 END),0)::int AS rented_days FROM vehicles v LEFT JOIN bookings b ON b.vehicle_id=v.vehicle_id GROUP BY v.vehicle_id;

CREATE OR REPLACE FUNCTION sync_vehicle_maintenance_status() RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE target_vehicle BIGINT := COALESCE(NEW.vehicle_id,OLD.vehicle_id);
BEGIN
  IF EXISTS (SELECT 1 FROM maintenance WHERE vehicle_id=target_vehicle AND maintenance_status IN ('SCHEDULED','IN_PROGRESS')) THEN
    UPDATE vehicles SET status='MAINTENANCE' WHERE vehicle_id=target_vehicle;
  ELSE
    UPDATE vehicles SET status='AVAILABLE' WHERE vehicle_id=target_vehicle AND status='MAINTENANCE';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER maintenance_status_after_change AFTER INSERT OR UPDATE OR DELETE ON maintenance FOR EACH ROW EXECUTE FUNCTION sync_vehicle_maintenance_status();

CREATE OR REPLACE FUNCTION customer_booking_history(input_user_id BIGINT) RETURNS SETOF booking_details LANGUAGE sql AS $$ SELECT * FROM booking_details WHERE user_id=input_user_id ORDER BY pickup_date DESC; $$;

-- Read-path indexes (also available as an additive migration for existing installs).
-- Additive read-performance migration for existing DriveEase installations.
-- No rows, columns, constraints, or business states are changed.
CREATE INDEX IF NOT EXISTS idx_vehicle_image_lookup ON vehicle_images(vehicle_id, image_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_review_lookup ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_customer_booking_page ON bookings(user_id, booking_id DESC);
CREATE INDEX IF NOT EXISTS idx_user_email_lookup ON users(LOWER(email));
