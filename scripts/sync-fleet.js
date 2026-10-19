import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const fleet = JSON.parse(readFileSync('database/fleet.json', 'utf8'));
const check = process.argv.includes('--check');
const sql = (value) =>
  typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;
const rows = fleet.map((v) =>
  [
    v.vehicleNumber,
    v.brand,
    v.model,
    v.vehicleType,
    v.year,
    v.fuelType,
    v.transmission,
    v.pricePerDay,
    'AVAILABLE',
  ]
    .map(sql)
    .join(', '),
);
const imageRows = fleet.map((v) => [v.vehicleNumber, v.imageUrl].map(sql).join(', '));
const catalogueSQL = `-- Generated from database/fleet.json by npm run sync:fleet.\n-- Re-runnable: preserves vehicle identities, prices, status and existing bookings.\nBEGIN;\nINSERT INTO vehicles(vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status) VALUES\n${rows.map((r) => '  (' + r + ')').join(',\n')}\nON CONFLICT(vehicle_number) DO NOTHING;\n\nWITH photos(vehicle_number,image_url) AS (VALUES\n${imageRows.map((r) => '  (' + r + ')').join(',\n')}\n)\nUPDATE vehicle_images AS i SET image_url=p.image_url\nFROM photos p JOIN vehicles v ON v.vehicle_number=p.vehicle_number\nWHERE i.image_id=(SELECT MIN(primary_image.image_id) FROM vehicle_images primary_image WHERE primary_image.vehicle_id=v.vehicle_id);\n\nWITH photos(vehicle_number,image_url) AS (VALUES\n${imageRows.map((r) => '  (' + r + ')').join(',\n')}\n)\nINSERT INTO vehicle_images(vehicle_id,image_url)\nSELECT v.vehicle_id,p.image_url FROM photos p JOIN vehicles v ON v.vehicle_number=p.vehicle_number\nWHERE NOT EXISTS(SELECT 1 FROM vehicle_images i WHERE i.vehicle_id=v.vehicle_id);\nCOMMIT;\n`;
const adminSQL = `-- Development-only seed administrator: admin@example.com / Admin@123\nINSERT INTO users(name,email,password_hash,phone,role) VALUES ('DriveEase Admin','admin@example.com','$2a$12$CaWFw3ETlDHSIdI8IdRAaOO7D2xp.HqNLYksA8YGCvlL1.yzuXErW','9999999999','ADMIN') ON CONFLICT(email) DO NOTHING;\n`;
const photos = Object.fromEntries(
  fleet.map((v) => [
    v.imageUrl,
    { model: `${v.brand} ${v.model}`, width: v.imageWidth, height: v.imageHeight, ...v.credit },
  ]),
);
const outputs = {
  'database/migrations/002_fleet_and_photos.sql': catalogueSQL,
  'database/seed.sql':
    '-- Generated: use npm run sync:fleet after editing database/fleet.json.\n' +
    adminSQL +
    catalogueSQL,
  'frontend/src/data/vehicle-photos.json': JSON.stringify(photos, null, 2) + '\n',
};
mkdirSync('frontend/src/data', { recursive: true });
for (const [path, content] of Object.entries(outputs)) {
  if (check)
    assert.equal(readFileSync(path, 'utf8'), content, `Generated fleet file is stale: ${path}`);
  else writeFileSync(path, content);
}
assert.equal(fleet.filter((v) => v.vehicleType === 'CAR').length, 6);
assert.equal(fleet.filter((v) => v.vehicleType === 'BIKE').length, 6);
assert.equal(new Set(fleet.map((v) => v.vehicleNumber)).size, fleet.length);
const hashes = new Set();
for (const v of fleet) {
  const path = 'frontend/public' + v.imageUrl;
  assert(existsSync(path), `Missing model photo: ${path}`);
  const bytes = readFileSync(path);
  assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', `Invalid photo format: ${path}`);
  assert(bytes.length > 5000 && bytes.length < 500000, `Unexpected photo size: ${path}`);
  hashes.add(createHash('sha256').update(bytes).digest('hex'));
  assert(v.credit.author && v.credit.sourceUrl && v.credit.license, 'Missing photo attribution');
}
assert.equal(hashes.size, fleet.length, 'Two different models reuse the same photo');
console.log(`Fleet verified: 6 cars, 6 bikes, ${hashes.size} unique credited local photos.`);
