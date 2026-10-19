// Explicit operator provisioning. Password comes from stdin, never source or argv.
import dotenv from '../backend/node_modules/dotenv/lib/main.js';
import pg from '../backend/node_modules/pg/lib/index.js';
import bcrypt from '../backend/node_modules/bcryptjs/index.js';
import { fileURLToPath } from 'node:url';
const envIndex = process.argv.indexOf('--env-file'),
  emailIndex = process.argv.indexOf('--email');
dotenv.config({
  path:
    envIndex >= 0
      ? process.argv[envIndex + 1]
      : fileURLToPath(new URL('../backend/.env', import.meta.url)),
  quiet: true,
});
const email = process.argv[emailIndex + 1];
if (emailIndex < 0 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error('Provide --email for the authorized administrator.');
let password = '';
for await (const chunk of process.stdin) password += chunk;
if (password.length < 10 || Buffer.byteLength(password) > 72)
  throw new Error('Provide a password of 10–72 bytes on stdin.');
const hash = await bcrypt.hash(password, 12);
password = '';
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
});
try {
  const r = await pool.query(
    "INSERT INTO users(name,email,password_hash,role) VALUES('DriveEase Administrator',$1,$2,'ADMIN') ON CONFLICT(email) DO NOTHING RETURNING user_id",
    [email.toLowerCase(), hash],
  );
  console.log(
    r.rowCount === 1
      ? 'Administrator account created. No driving licence was fabricated.'
      : 'Account already exists; its password and role were not changed.',
  );
} catch (e) {
  console.error(`Administrator provisioning failed (${e.code || 'connection_error'}).`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
