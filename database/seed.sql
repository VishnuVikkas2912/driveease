-- Generated: use npm run sync:fleet after editing database/fleet.json.
-- Development-only seed administrator: admin@example.com / Admin@123
INSERT INTO users(name,email,password_hash,phone,role) VALUES ('DriveEase Admin','admin@example.com','$2a$12$CaWFw3ETlDHSIdI8IdRAaOO7D2xp.HqNLYksA8YGCvlL1.yzuXErW','9999999999','ADMIN') ON CONFLICT(email) DO NOTHING;
-- Generated from database/fleet.json by npm run sync:fleet.
-- Re-runnable: preserves vehicle identities, prices, status and existing bookings.
BEGIN;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status) VALUES
  ('DL01AB1234', 'Tata', 'Nexon', 'CAR', 2024, 'PETROL', 'AUTOMATIC', 2200, 'AVAILABLE'),
  ('MH12CD5678', 'Hyundai', 'i20', 'CAR', 2023, 'PETROL', 'MANUAL', 1600, 'AVAILABLE'),
  ('KA05EF2468', 'Royal Enfield', 'Classic 350', 'BIKE', 2024, 'PETROL', 'MANUAL', 900, 'AVAILABLE'),
  ('TN09GH1357', 'Ather', '450X', 'BIKE', 2024, 'ELECTRIC', 'AUTOMATIC', 750, 'AVAILABLE'),
  ('KA01DE5101', 'Maruti Suzuki', 'Swift', 'CAR', 2021, 'PETROL', 'MANUAL', 1400, 'AVAILABLE'),
  ('KA01DE5102', 'Hyundai', 'Creta', 'CAR', 2022, 'DIESEL', 'AUTOMATIC', 2800, 'AVAILABLE'),
  ('KA01DE5103', 'Mahindra', 'Thar', 'CAR', 2023, 'DIESEL', 'MANUAL', 3500, 'AVAILABLE'),
  ('KA01DE5104', 'Honda', 'City', 'CAR', 2022, 'PETROL', 'MANUAL', 2600, 'AVAILABLE'),
  ('KA01DE6101', 'Royal Enfield', 'Himalayan', 'BIKE', 2022, 'PETROL', 'MANUAL', 1400, 'AVAILABLE'),
  ('KA01DE6102', 'KTM', '390 Duke', 'BIKE', 2022, 'PETROL', 'MANUAL', 1200, 'AVAILABLE'),
  ('KA01DE6103', 'Bajaj', 'Pulsar NS200', 'BIKE', 2022, 'PETROL', 'MANUAL', 800, 'AVAILABLE'),
  ('KA01DE6104', 'Yamaha', 'MT-15', 'BIKE', 2024, 'PETROL', 'MANUAL', 950, 'AVAILABLE')
ON CONFLICT(vehicle_number) DO NOTHING;

WITH photos(vehicle_number,image_url) AS (VALUES
  ('DL01AB1234', '/images/vehicles/nexon.webp'),
  ('MH12CD5678', '/images/vehicles/i20.webp'),
  ('KA05EF2468', '/images/vehicles/classic-350.webp'),
  ('TN09GH1357', '/images/vehicles/ather-450x.webp'),
  ('KA01DE5101', '/images/vehicles/swift.webp'),
  ('KA01DE5102', '/images/vehicles/creta.webp'),
  ('KA01DE5103', '/images/vehicles/thar.webp'),
  ('KA01DE5104', '/images/vehicles/city.webp'),
  ('KA01DE6101', '/images/vehicles/himalayan.webp'),
  ('KA01DE6102', '/images/vehicles/duke-390.webp'),
  ('KA01DE6103', '/images/vehicles/pulsar-ns200.webp'),
  ('KA01DE6104', '/images/vehicles/mt-15.webp')
)
UPDATE vehicle_images AS i SET image_url=p.image_url
FROM photos p JOIN vehicles v ON v.vehicle_number=p.vehicle_number
WHERE i.image_id=(SELECT MIN(primary_image.image_id) FROM vehicle_images primary_image WHERE primary_image.vehicle_id=v.vehicle_id);

WITH photos(vehicle_number,image_url) AS (VALUES
  ('DL01AB1234', '/images/vehicles/nexon.webp'),
  ('MH12CD5678', '/images/vehicles/i20.webp'),
  ('KA05EF2468', '/images/vehicles/classic-350.webp'),
  ('TN09GH1357', '/images/vehicles/ather-450x.webp'),
  ('KA01DE5101', '/images/vehicles/swift.webp'),
  ('KA01DE5102', '/images/vehicles/creta.webp'),
  ('KA01DE5103', '/images/vehicles/thar.webp'),
  ('KA01DE5104', '/images/vehicles/city.webp'),
  ('KA01DE6101', '/images/vehicles/himalayan.webp'),
  ('KA01DE6102', '/images/vehicles/duke-390.webp'),
  ('KA01DE6103', '/images/vehicles/pulsar-ns200.webp'),
  ('KA01DE6104', '/images/vehicles/mt-15.webp')
)
INSERT INTO vehicle_images(vehicle_id,image_url)
SELECT v.vehicle_id,p.image_url FROM photos p JOIN vehicles v ON v.vehicle_number=p.vehicle_number
WHERE NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
COMMIT;
