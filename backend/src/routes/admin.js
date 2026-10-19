import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, fail, isoDate, positiveId, pagination } from '../utils/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth, requireAdmin);
router.get(
  '/fleet',
  asyncHandler(async (req, res) => {
    const paging = pagination(req.query, 10);
    if (!paging || (req.query.locationId && !positiveId(req.query.locationId)))
      return fail(res, 400, 'Choose a valid pickup hub and page.');
    const { rows } = await pool.query(
      `SELECT v.*,l.city,l.name location_name,l.address location_address,(SELECT image_url FROM vehicle_images WHERE vehicle_id=v.vehicle_id ORDER BY image_id LIMIT 1) image_url,
    EXISTS(SELECT 1 FROM bookings b WHERE b.vehicle_id=v.vehicle_id AND b.booking_status IN ('PENDING','APPROVED') AND b.dropoff_date > (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date) location_locked
    FROM vehicles v LEFT JOIN locations l ON l.location_id=v.location_id
    WHERE ($1::bigint IS NULL OR v.location_id=$1) ORDER BY v.vehicle_id LIMIT $2 OFFSET $3`,
      [req.query.locationId || null, paging.limit, paging.offset],
    );
    res.json(rows);
  }),
);
router.post(
  '/locations',
  asyncHandler(async (req, res) => {
    const { city, name, address } = req.body;
    if (
      ![city, name, address].every((v) => typeof v === 'string' && v.trim()) ||
      city.length > 80 ||
      name.length > 100 ||
      address.length > 240
    )
      return fail(res, 400, 'Enter a city, hub name and pickup address within the field limits.');
    const {
      rows: [location],
    } = await pool.query(
      'INSERT INTO locations(city,name,address) VALUES($1,$2,$3) ON CONFLICT(city,name) DO NOTHING RETURNING *',
      [city.trim(), name.trim(), address.trim()],
    );
    if (!location) return fail(res, 409, 'That pickup hub already exists.');
    res.status(201).json(location);
  }),
);
router.patch(
  '/fleet/:id/location',
  asyncHandler(async (req, res) => {
    const { locationId, previousLocationId } = req.body;
    if (
      !positiveId(req.params.id) ||
      !positiveId(locationId) ||
      !(previousLocationId === null || positiveId(previousLocationId))
    )
      return fail(res, 400, 'Choose a vehicle and pickup hub, then refresh before saving.');
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      const {
        rows: [v],
      } = await conn.query('SELECT * FROM vehicles WHERE vehicle_id=$1 FOR UPDATE', [
        req.params.id,
      ]);
      if (!v) {
        await conn.query('ROLLBACK');
        return fail(res, 404, 'Vehicle not found.');
      }
      if (String(v.location_id) !== String(previousLocationId)) {
        await conn.query('ROLLBACK');
        return fail(res, 409, 'The pickup hub changed. Refresh the fleet before saving.');
      }
      if (
        !(await conn.query('SELECT 1 FROM locations WHERE location_id=$1', [locationId])).rowCount
      ) {
        await conn.query('ROLLBACK');
        return fail(res, 400, 'Pickup hub not found.');
      }
      await conn.query('UPDATE vehicles SET location_id=$1 WHERE vehicle_id=$2', [
        locationId,
        req.params.id,
      ]);
      await conn.query('COMMIT');
      res.json({ message: 'Pickup hub updated.' });
    } catch (e) {
      await conn.query('ROLLBACK');
      if (e.code === '23514')
        return fail(
          res,
          409,
          'This vehicle has upcoming or active reservations. Resolve those reservations before moving it.',
        );
      throw e;
    } finally {
      conn.release();
    }
  }),
);
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
    const { rows: locations } = await pool.query(
      `SELECT l.location_id,l.city,l.name,COUNT(v.vehicle_id)::int vehicles,COUNT(v.vehicle_id) FILTER(WHERE v.status='AVAILABLE')::int available FROM locations l LEFT JOIN vehicles v ON v.location_id=l.location_id AND v.status<>'RETIRED' GROUP BY l.location_id ORDER BY l.city,l.name LIMIT 100`,
    );
    const {
      rows: [unassigned],
    } = await pool.query(
      "SELECT COUNT(*)::int count FROM vehicles WHERE location_id IS NULL AND status<>'RETIRED'",
    );
    res.json({
      counts,
      utilization,
      locations,
      unassignedVehicles: unassigned.count,
      monthlyRevenue: monthlyRevenue.reverse(),
    });
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
