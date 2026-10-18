import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import pg from '../backend/node_modules/pg/lib/index.js';
import { initializeEmptyDatabase } from '../backend/src/db/initialize.js';
import { fileURLToPath } from 'node:url';

const envIndex = process.argv.indexOf('--env-file');
const envFile =
  envIndex >= 0
    ? process.argv[envIndex + 1]
    : fileURLToPath(new URL('../backend/.env', import.meta.url));
if (!envFile) throw new Error('Provide a local environment file after --env-file.');
dotenv.config({ path: envFile });
if (!process.argv.includes('--empty-database'))
  throw new Error('Use --empty-database to initialize a new, empty project.');
if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in the local environment file.');
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
  await conn.query('SET search_path TO public');
  await initializeEmptyDatabase(conn);
  console.log('DriveEase initialized: 12 vehicles, 0 user accounts; client API access restricted.');
} catch (error) {
  // Keep connection strings/passwords out of command output.
  console.error(
    error.message.startsWith('Database schema is not empty')
      ? error.message
      : `Database initialization failed (${error.code || 'connection_or_setup_error'}).`,
  );
  process.exitCode = 1;
} finally {
  conn?.release();
  await pool.end();
}
