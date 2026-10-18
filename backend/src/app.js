import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import auth from './routes/auth.js';
import vehicles from './routes/vehicles.js';
import bookings from './routes/bookings.js';
import admin from './routes/admin.js';
import { pool } from './db/pool.js';
import { rateLimit } from 'express-rate-limit';

if (!process.env.DATABASE_URL || (process.env.JWT_SECRET || '').length < 32) {
  throw new Error(
    'Configure DATABASE_URL and a JWT_SECRET of at least 32 characters before starting DriveEase.',
  );
}

const app = express();
const allowedOrigins =
  process.env.CLIENT_URL?.split(',')
    .map((value) => value.trim())
    .filter(Boolean) || [];

app.use((req, res, next) => {
  const origin = req.get('origin');
  const sameOrigin =
    origin === `https://${req.get('host')}` ||
    (process.env.NODE_ENV !== 'production' && origin === `http://${req.get('host')}`);
  const localDev =
    process.env.NODE_ENV !== 'production' &&
    /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
  if (origin && !sameOrigin && !localDev && !allowedOrigins.includes(origin))
    return res.status(403).json({ message: 'This site is not allowed to access the API.' });
  return cors({ origin: origin || false })(req, res, next);
});

app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));
app.use(
  '/api/auth',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'test' ? 1000 : 40,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Too many sign-in attempts. Try again in 15 minutes.' },
  }),
);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.get('/api/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1 FROM vehicles LIMIT 1');
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ message: 'Database is unavailable. Check server connection settings.' });
  }
});
app.use('/api/auth', auth);
app.use('/api/vehicles', vehicles);
app.use('/api/bookings', bookings);
app.use('/api/admin', admin);
app.use('/api', (req, res) => res.status(404).json({ message: 'API endpoint not found.' }));

app.use((err, req, res, next) => {
  console.error('Request failed:', err.code || err.type || 'internal_error');
  const badInput = ['23503', '23514', '22001', '22P02', '22007', '22008'].includes(err.code);
  const status =
    err.code === '23505'
      ? 409
      : badInput || err.type === 'entity.parse.failed'
        ? 400
        : err.type === 'entity.too.large'
          ? 413
          : 500;
  res.status(status).json({
    message:
      err.code === '23505'
        ? 'That record already exists.'
        : status === 400
          ? 'Check the values you entered and try again.'
          : status === 413
            ? 'This request is too large.'
            : 'The server could not complete the request. Try again.',
  });
});

export default app;
