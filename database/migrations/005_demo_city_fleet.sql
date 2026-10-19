-- Generated from database/fleet-units.json. Demo hubs are not verified pickup addresses.
INSERT INTO locations(city,name,address) VALUES
('Delhi','Delhi demo hub','Demo collection point in Delhi. Confirm pickup details with the administrator.'),
('Chennai','Chennai demo hub','Demo collection point in Chennai. Confirm pickup details with the administrator.')
ON CONFLICT(city,name) DO NOTHING;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'DL01AB1234',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='DL01AB1234' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/nexon.webp' FROM vehicles v WHERE vehicle_number='DL01AB1234' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='DL01AB1234' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'MH12CD5678',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='MH12CD5678' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/i20.webp' FROM vehicles v WHERE vehicle_number='MH12CD5678' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='MH12CD5678' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA05EF2468',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA05EF2468' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/classic-350.webp' FROM vehicles v WHERE vehicle_number='KA05EF2468' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='KA05EF2468' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'TN09GH1357',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='TN09GH1357' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/ather-450x.webp' FROM vehicles v WHERE vehicle_number='TN09GH1357' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='TN09GH1357' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE5101',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE5101' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/swift.webp' FROM vehicles v WHERE vehicle_number='KA01DE5101' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='KA01DE5101' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE5102',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE5102' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/creta.webp' FROM vehicles v WHERE vehicle_number='KA01DE5102' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='KA01DE5102' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE5103',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE5103' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/thar.webp' FROM vehicles v WHERE vehicle_number='KA01DE5103' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='KA01DE5103' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE5104',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE5104' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/city.webp' FROM vehicles v WHERE vehicle_number='KA01DE5104' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='KA01DE5104' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE6101',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE6101' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/himalayan.webp' FROM vehicles v WHERE vehicle_number='KA01DE6101' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='KA01DE6101' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE6102',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE6102' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/duke-390.webp' FROM vehicles v WHERE vehicle_number='KA01DE6102' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='KA01DE6102' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE6103',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE6103' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/pulsar-ns200.webp' FROM vehicles v WHERE vehicle_number='KA01DE6103' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='KA01DE6103' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'KA01DE6104',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE6104' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/mt-15.webp' FROM vehicles v WHERE vehicle_number='KA01DE6104' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='KA01DE6104' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'DL01DE7001',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE5103' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/thar.webp' FROM vehicles v WHERE vehicle_number='DL01DE7001' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='DL01DE7001' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'DL01DE7002',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE5104' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/city.webp' FROM vehicles v WHERE vehicle_number='DL01DE7002' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='DL01DE7002' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'DL01DE7003',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE6101' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/himalayan.webp' FROM vehicles v WHERE vehicle_number='DL01DE7003' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='DL01DE7003' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'DL01DE7004',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA01DE6102' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/duke-390.webp' FROM vehicles v WHERE vehicle_number='DL01DE7004' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Delhi' AND name='Delhi demo hub') WHERE vehicle_number='DL01DE7004' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'TN09DE8001',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='DL01AB1234' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/nexon.webp' FROM vehicles v WHERE vehicle_number='TN09DE8001' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='TN09DE8001' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'TN09DE8002',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='MH12CD5678' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/i20.webp' FROM vehicles v WHERE vehicle_number='TN09DE8002' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='TN09DE8002' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'TN09DE8003',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='KA05EF2468' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/classic-350.webp' FROM vehicles v WHERE vehicle_number='TN09DE8003' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='TN09DE8003' AND location_id IS NULL;
INSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status)
SELECT 'TN09DE8004',brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,'AVAILABLE' FROM vehicles WHERE vehicle_number='TN09GH1357' ON CONFLICT(vehicle_number) DO NOTHING;
INSERT INTO vehicle_images(vehicle_id,image_url) SELECT vehicle_id,'/images/vehicles/ather-450x.webp' FROM vehicles v WHERE vehicle_number='TN09DE8004' AND NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);
UPDATE vehicles SET location_id=(SELECT location_id FROM locations WHERE city='Chennai' AND name='Chennai demo hub') WHERE vehicle_number='TN09DE8004' AND location_id IS NULL;
