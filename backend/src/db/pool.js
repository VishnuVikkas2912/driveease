import pg from 'pg';
import 'dotenv/config';
pg.types.setTypeParser(1082, (value) => value); // Preserve SQL DATE without timezone shifts.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? {
          rejectUnauthorized: true,
          ...(process.env.DATABASE_CA ? { ca: process.env.DATABASE_CA } : {}),
        }
      : undefined,
  max: 5,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 10000,
  application_name: 'driveease',
});
pool.on('error', (error) =>
  console.error('Database pool error:', error.code || 'connection_failed'),
);
