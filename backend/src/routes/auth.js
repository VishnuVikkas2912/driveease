import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../db/pool.js';
import { asyncHandler, fail } from '../utils/http.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const tokenFor = (user) => jwt.sign({ id: user.user_id, name: user.name, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, phone, licenseNumber, issueDate, expiryDate } = req.body;
  if (!name || !email || !password || !licenseNumber || !issueDate || !expiryDate) return fail(res, 400, 'Complete all required registration fields.');
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const { rows: exists } = await conn.query('SELECT user_id FROM users WHERE email = $1 OR EXISTS (SELECT 1 FROM driving_licenses WHERE license_number = $2)', [email, licenseNumber]);
    if (exists.length) { await conn.query('ROLLBACK'); return fail(res, 409, 'Email or driving licence already exists.'); }
    const hash = await bcrypt.hash(password, 12);
    const { rows: [created] } = await conn.query("INSERT INTO users (name,email,password_hash,phone,role) VALUES ($1,$2,$3,$4,'CUSTOMER') RETURNING user_id", [name, email, hash, phone || null]);
    await conn.query('INSERT INTO driving_licenses (user_id,license_number,issue_date,expiry_date) VALUES ($1,$2,$3,$4)', [created.user_id, licenseNumber, issueDate, expiryDate]);
    await conn.query('COMMIT');
    const user = { user_id: created.user_id, name, role: 'CUSTOMER' };
    res.status(201).json({ token: tokenFor(user), user: { id: user.user_id, name, role: user.role } });
  } catch (e) { await conn.query('ROLLBACK'); throw e; } finally { conn.release(); }
}));
router.post('/login', asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT user_id,name,email,password_hash,role FROM users WHERE email = $1', [req.body.email || '']);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) return fail(res, 401, 'Incorrect email or password.');
  res.json({ token: tokenFor(user), user: { id: user.user_id, name: user.name, role: user.role } });
}));
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const { rows } = await pool.query('SELECT u.user_id,u.name,u.email,u.phone,u.role,l.license_number,l.issue_date,l.expiry_date,l.license_status FROM users u LEFT JOIN driving_licenses l ON l.user_id=u.user_id WHERE u.user_id=$1', [req.user.id]);
  res.json(rows[0]);
}));
export default router;
