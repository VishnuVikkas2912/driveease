import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import pg from '../backend/node_modules/pg/lib/index.js';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const args = process.argv;
const envIndex = args.indexOf('--env-file');
dotenv.config({
  path:
    envIndex >= 0 ? args[envIndex + 1] : fileURLToPath(new URL('../backend/.env', import.meta.url)),
  quiet: true,
});
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA } : {}),
        }
      : undefined,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
});
let conn;
try {
  conn = await pool.connect();
  await conn.query('BEGIN');
  await conn.query('SET search_path TO public');
  await conn.query("SELECT pg_advisory_xact_lock(hashtext('driveease:locations'))");
  for (const name of ['004_vehicle_locations.sql', '005_demo_city_fleet.sql'])
    await conn.query(
      await readFile(new URL('../database/migrations/' + name, import.meta.url), 'utf8'),
    );
  const emailIndex = args.indexOf('--admin-email');
  if (emailIndex >= 0) {
    const email = args[emailIndex + 1];
    if (!email || !email.includes('@')) throw new Error('missing_admin_email');
    const result = await conn.query(
      "UPDATE users SET role='ADMIN' WHERE LOWER(email)=$1 RETURNING user_id",
      [email.trim().toLowerCase()],
    );
    console.log(
      result.rowCount === 1
        ? 'Requested registered account now has administrator access.'
        : 'Requested admin account does not exist yet; no account was created.',
    );
  }
  const { rows } = await conn.query(
    'SELECT l.city,COUNT(v.vehicle_id)::int vehicles FROM locations l LEFT JOIN vehicles v USING(location_id) GROUP BY l.location_id ORDER BY l.city',
  );
  await conn.query('COMMIT');
  console.log(JSON.stringify({ status: 'migrated', locations: rows }));
} catch (error) {
  if (conn) await conn.query('ROLLBACK');
  console.error(`Location migration failed (${error.code || 'setup_error'}).`);
  process.exitCode = 1;
} finally {
  conn?.release();
  await pool.end();
}
