-- Additive read-performance migration for existing DriveEase installations.
-- No rows, columns, constraints, or business states are changed.
CREATE INDEX IF NOT EXISTS idx_vehicle_image_lookup ON vehicle_images(vehicle_id, image_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_review_lookup ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_customer_booking_page ON bookings(user_id, booking_id DESC);
CREATE INDEX IF NOT EXISTS idx_user_email_lookup ON users(LOWER(email));
