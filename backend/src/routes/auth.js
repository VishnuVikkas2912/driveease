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
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [exists] = await conn.execute('SELECT user_id FROM users WHERE email = ? OR EXISTS (SELECT 1 FROM driving_licenses WHERE license_number = ?)', [email, licenseNumber]);
    if (exists.length) { await conn.rollback(); return fail(res, 409, 'Email or driving licence already exists.'); }
    const hash = await bcrypt.hash(password, 12);
    const [created] = await conn.execute('INSERT INTO users (name,email,password_hash,phone,role) VALUES (?,?,?,?,\'CUSTOMER\')', [name, email, hash, phone || null]);
    await conn.execute('INSERT INTO driving_licenses (user_id,license_number,issue_date,expiry_date) VALUES (?,?,?,?)', [created.insertId, licenseNumber, issueDate, expiryDate]);
    await conn.commit();
    const user = { user_id: created.insertId, name, role: 'CUSTOMER' };
    res.status(201).json({ token: tokenFor(user), user: { id: user.user_id, name, role: user.role } });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));
router.post('/login', asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT user_id,name,email,password_hash,role FROM users WHERE email = ?', [req.body.email || '']);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password_hash))) return fail(res, 401, 'Incorrect email or password.');
  res.json({ token: tokenFor(user), user: { id: user.user_id, name: user.name, role: user.role } });
}));
router.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const [rows] = await pool.execute('SELECT u.user_id,u.name,u.email,u.phone,u.role,l.license_number,l.issue_date,l.expiry_date,l.license_status FROM users u LEFT JOIN driving_licenses l ON l.user_id=u.user_id WHERE u.user_id=?', [req.user.id]);
  res.json(rows[0]);
}));
export default router;
