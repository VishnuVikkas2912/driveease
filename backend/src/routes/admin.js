import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, fail, isoDate, positiveId, pagination } from '../utils/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, requireAdmin);
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const {
      rows: [counts],
    } = await pool.query(
      `SELECT (SELECT COUNT(*) FROM users WHERE role='CUSTOMER')::int customers,(SELECT COUNT(*) FROM vehicles WHERE status='AVAILABLE')::int "availableVehicles",(SELECT COUNT(*) FROM bookings WHERE booking_status='PENDING')::int "pendingBookings",(SELECT COALESCE(SUM(amount),0) FROM payments WHERE payment_status='SUCCESS') revenue`,
    );
    const { rows: utilization } = await pool.query(
      'SELECT * FROM vehicle_utilization ORDER BY booking_count DESC,vehicle_id LIMIT 6',
    );
    const { rows: monthlyRevenue } = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month',payment_date),'Mon YYYY') label, SUM(amount) revenue FROM payments WHERE payment_status='SUCCESS' GROUP BY DATE_TRUNC('month',payment_date) ORDER BY DATE_TRUNC('month',payment_date) DESC LIMIT 6`,
    );
    res.json({ counts, utilization, monthlyRevenue: monthlyRevenue.reverse() });
  }),
);
router.get(
  '/customers',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      `SELECT u.user_id,u.name,u.email,u.phone,u.created_at,l.license_number,l.license_status,COUNT(b.booking_id)::int booking_count FROM users u LEFT JOIN driving_licenses l ON l.user_id=u.user_id LEFT JOIN bookings b ON b.user_id=u.user_id WHERE u.role='CUSTOMER' GROUP BY u.user_id,l.license_id ORDER BY u.created_at DESC`,
    );
    res.json(rows);
  }),
);
router.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const { rows: revenueByVehicle } = await pool.query(
      `SELECT v.vehicle_id,CONCAT(v.brand,' ',v.model) vehicle,COALESCE(SUM(p.amount),0) revenue,COUNT(DISTINCT b.booking_id)::int bookings FROM vehicles v LEFT JOIN bookings b ON b.vehicle_id=v.vehicle_id LEFT JOIN payments p ON p.booking_id=b.booking_id AND p.payment_status='SUCCESS' GROUP BY v.vehicle_id ORDER BY revenue DESC`,
    );
    res.json({ revenueByVehicle });
  }),
);
router.post(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const { vehicleId, type, description, startDate, endDate, cost } = req.body;
    if (
      !positiveId(vehicleId) ||
      typeof type !== 'string' ||
      type.length > 100 ||
      !isoDate(startDate) ||
      (endDate && (!isoDate(endDate) || endDate < startDate)) ||
      !Number.isFinite(Number(cost || 0)) ||
      Number(cost || 0) < 0
    )
      return fail(res, 400, 'Choose a vehicle, task, valid service dates and non-negative cost.');
    if (!vehicleId || !type || !startDate)
      return fail(res, 400, 'Vehicle, maintenance type and start date are required.');
    const {
      rows: [r],
    } = await pool.query(
      "INSERT INTO maintenance(vehicle_id,maintenance_type,description,start_date,end_date,cost,maintenance_status) VALUES($1,$2,$3,$4,$5,$6,'SCHEDULED') RETURNING maintenance_id",
      [vehicleId, type, description || null, startDate, endDate || null, cost || 0],
    );
    res.status(201).json({ maintenanceId: r.maintenance_id });
  }),
);
router.get(
  '/maintenance',
  asyncHandler(async (req, res) => {
    const paging = pagination(req.query, 10);
    if (!paging) return fail(res, 400, 'Invalid page size or offset.');
    const { rows } = await pool.query(
      `SELECT m.*,v.brand,v.model,v.vehicle_number FROM maintenance m JOIN vehicles v ON v.vehicle_id=m.vehicle_id ORDER BY m.maintenance_id DESC LIMIT $1 OFFSET $2`,
      [paging.limit, paging.offset],
    );
    res.json(rows);
  }),
);
router.patch(
  '/maintenance/:id',
  asyncHandler(async (req, res) => {
    const { status, endDate } = req.body;
    if (
      !positiveId(req.params.id) ||
      (endDate && !isoDate(endDate)) ||
      !['SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].includes(status)
    )
      return fail(res, 400, 'Invalid maintenance status.');
    const { rowCount } = await pool.query(
      'UPDATE maintenance SET maintenance_status=$1,end_date=COALESCE($2,end_date) WHERE maintenance_id=$3',
      [status, endDate || null, req.params.id],
    );
    if (!rowCount) return fail(res, 404, 'Maintenance record not found.');
    res.json({ message: 'Maintenance updated.' });
  }),
);
export default router;
