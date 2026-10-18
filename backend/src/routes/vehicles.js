import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, fail, validDateRange, pagination, positiveId } from '../utils/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();
const summary = `SELECT v.*,(SELECT image_url FROM vehicle_images WHERE vehicle_id=v.vehicle_id ORDER BY image_id LIMIT 1) image_url,(SELECT ROUND(AVG(rating),1) FROM reviews WHERE vehicle_id=v.vehicle_id) rating FROM vehicles v`;
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, brand, fuel, transmission, maxPrice, pickupDate, dropoffDate } = req.query;
    const paging = pagination(req.query);
    if (!paging) return fail(res, 400, 'Use a limit from 1 to 101 and a non-negative offset.');
    if (type && !['CAR', 'BIKE'].includes(type)) return fail(res, 400, 'Choose cars or bikes.');
    if ((pickupDate || dropoffDate) && !validDateRange(pickupDate, dropoffDate))
      return fail(res, 400, 'Choose today or a future pickup and a later return date.');
    if (maxPrice && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) <= 0))
      return fail(res, 400, 'Maximum price must be positive.');
    const where = ["v.status='AVAILABLE'"],
      params = [];
    const add = (clause, value) => {
      params.push(value);
      where.push(clause.replace('?', `$${params.length}`));
    };
    for (const [col, val] of [
      ['vehicle_type', type],
      ['brand', brand],
      ['fuel_type', fuel],
      ['transmission', transmission],
    ])
      if (val) add(`v.${col}=?`, val);
    if (maxPrice) add('v.price_per_day<=?', Number(maxPrice));
    if (pickupDate && dropoffDate) {
      const drop = `$${params.length + 1}`,
        pick = `$${params.length + 2}`;
      params.push(dropoffDate, pickupDate);
      where.push(
        `NOT EXISTS (SELECT 1 FROM bookings b WHERE b.vehicle_id=v.vehicle_id AND b.booking_status IN ('PENDING','APPROVED') AND b.pickup_date < ${drop} AND b.dropoff_date > ${pick})`,
      );
      where.push(
        `NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.vehicle_id=v.vehicle_id AND m.maintenance_status IN ('SCHEDULED','IN_PROGRESS') AND m.start_date < ${drop} AND COALESCE(m.end_date,DATE '9999-12-31') >= ${pick})`,
      );
    }
    params.push(paging.limit, paging.offset);
    const { rows } = await pool.query(
      `${summary} WHERE ${where.join(' AND ')} ORDER BY v.vehicle_id LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json(rows);
  }),
);
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const {
      rows: [counts],
    } = await pool.query(
      `SELECT COUNT(*)::int total, COUNT(*) FILTER (WHERE vehicle_type='CAR')::int cars, COUNT(*) FILTER (WHERE vehicle_type='BIKE')::int bikes FROM vehicles WHERE status <> 'RETIRED'`,
    );
    res.json(counts);
  }),
);
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!positiveId(req.params.id)) return fail(res, 400, 'Invalid vehicle identifier.');
    const {
      rows: [vehicle],
    } = await pool.query(`${summary} WHERE v.vehicle_id=$1`, [req.params.id]);
    if (!vehicle) return fail(res, 404, 'Vehicle not found.');
    const { rows: reviews } = await pool.query(
      'SELECT r.review_id,r.rating,r.comment,r.review_date,u.name FROM reviews r JOIN users u ON u.user_id=r.user_id WHERE r.vehicle_id=$1 ORDER BY review_date DESC LIMIT 20',
      [req.params.id],
    );
    res.json({ ...vehicle, reviews });
  }),
);
// Existing administrator fleet APIs remain server-authorized.
router.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const v = req.body;
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      const {
        rows: [r],
      } = await conn.query(
        'INSERT INTO vehicles (vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING vehicle_id',
        [
          v.vehicleNumber,
          v.brand,
          v.model,
          v.vehicleType,
          v.year,
          v.fuelType,
          v.transmission,
          v.pricePerDay,
          v.status || 'AVAILABLE',
        ],
      );
      if (v.imageUrl)
        await conn.query('INSERT INTO vehicle_images(vehicle_id,image_url) VALUES($1,$2)', [
          r.vehicle_id,
          v.imageUrl,
        ]);
      await conn.query('COMMIT');
      res.status(201).json({ vehicleId: r.vehicle_id });
    } catch (e) {
      await conn.query('ROLLBACK');
      throw e;
    } finally {
      conn.release();
    }
  }),
);
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const v = req.body;
    await pool.query(
      'UPDATE vehicles SET brand=$1,model=$2,vehicle_type=$3,year=$4,fuel_type=$5,transmission=$6,price_per_day=$7,status=$8 WHERE vehicle_id=$9',
      [
        v.brand,
        v.model,
        v.vehicleType,
        v.year,
        v.fuelType,
        v.transmission,
        v.pricePerDay,
        v.status,
        req.params.id,
      ],
    );
    res.json({ message: 'Vehicle updated.' });
  }),
);
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    await pool.query("UPDATE vehicles SET status='RETIRED' WHERE vehicle_id=$1", [req.params.id]);
    res.json({ message: 'Vehicle retired.' });
  }),
);
export default router;
