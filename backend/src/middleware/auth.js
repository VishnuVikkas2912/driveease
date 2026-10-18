import jwt from 'jsonwebtoken';
import { fail } from '../utils/http.js';

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return fail(res, 401, 'Authentication required.');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return fail(res, 401, 'Your session is invalid or expired.');
  }
}
export const requireAdmin = (req, res, next) =>
  req.user?.role === 'ADMIN' ? next() : fail(res, 403, 'Admin access required.');
