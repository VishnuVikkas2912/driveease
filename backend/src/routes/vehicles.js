import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, fail, validDateRange, pagination, positiveId } from '../utils/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { vehicleErrors } from '../../../shared/vehicle-input.js';
const router = Router();
const summary = `SELECT v.*,l.city,l.name location_name,l.address location_address,(SELECT image_url FROM vehicle_images WHERE vehicle_id=v.vehicle_id ORDER BY image_id LIMIT 1) image_url,(SELECT ROUND(AVG(rating),1) FROM reviews WHERE vehicle_id=v.vehicle_id) rating FROM vehicles v LEFT JOIN locations l ON l.location_id=v.location_id`;
router.get(
  '/locations',
  asyncHandler(async (req, res) => {
    const { rows } = await pool.query(
      'SELECT location_id,city,name,address FROM locations ORDER BY city,name LIMIT 100',
    );
    res.json(rows);
  }),
);
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, brand, fuel, transmission, maxPrice, pickupDate, dropoffDate, locationId } =
      req.query;
    const paging = pagination(req.query);
    if (!paging) return fail(res, 400, 'Use a limit from 1 to 101 and a non-negative offset.');
    if (type && !['CAR', 'BIKE'].includes(type)) return fail(res, 400, 'Choose cars or bikes.');
    if ((pickupDate || dropoffDate) && !validDateRange(pickupDate, dropoffDate))
      return fail(res, 400, 'Choose today or a future pickup and a later return date.');
    if (maxPrice && (!Number.isFinite(Number(maxPrice)) || Number(maxPrice) <= 0))
      return fail(res, 400, 'Maximum price must be positive.');
    if (locationId && !positiveId(locationId)) return fail(res, 400, 'Choose a valid pickup hub.');
    const where = ["v.status='AVAILABLE'", 'v.location_id IS NOT NULL'],
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
    if (locationId) add('v.location_id=?', locationId);
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
for (const method of ['post', 'put'])
  router[method](
    method === 'post' ? '/' : '/:id',
    requireAuth,
    requireAdmin,
    asyncHandler(async (req, res) => {
      const v = req.body;
      const errors = vehicleErrors(v);
      if (Object.keys(errors).length)
        return res.status(400).json({ message: 'Check the vehicle details.', errors });
      if (method === 'put' && (!positiveId(req.params.id) || !positiveId(v.previousRevision)))
        return fail(res, 400, 'Refresh the vehicle before editing it.');
      const conn = await pool.connect();
      try {
        await conn.query('BEGIN');
        if (
          !(await conn.query('SELECT 1 FROM locations WHERE location_id=$1', [v.locationId]))
            .rowCount
        ) {
          await conn.query('ROLLBACK');
          return fail(res, 400, 'Pickup hub not found.');
        }
        let vehicleId;
        if (method === 'put') {
          const {
            rows: [old],
          } = await conn.query('SELECT * FROM vehicles WHERE vehicle_id=$1 FOR UPDATE', [
            req.params.id,
          ]);
          if (!old) {
            await conn.query('ROLLBACK');
            return fail(res, 404, 'Vehicle not found.');
          }
          if (old.revision !== Number(v.previousRevision)) {
            await conn.query('ROLLBACK');
            return fail(
              res,
              409,
              'This vehicle changed since you opened it. Close this form, refresh the fleet and edit again.',
            );
          }
          await conn.query(
            'UPDATE vehicles SET vehicle_number=$1,brand=$2,model=$3,vehicle_type=$4,year=$5,fuel_type=$6,transmission=$7,price_per_day=$8,location_id=$9 WHERE vehicle_id=$10',
            [
              v.vehicleNumber,
              v.brand.trim(),
              v.model.trim(),
              v.vehicleType,
              v.year,
              v.fuelType,
              v.transmission,
              v.pricePerDay,
              v.locationId,
              req.params.id,
            ],
          );
          vehicleId = req.params.id;
        } else {
          const {
            rows: [r],
          } = await conn.query(
            'INSERT INTO vehicles (vehicle_number,brand,model,vehicle_type,year,fuel_type,transmission,price_per_day,status,location_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING vehicle_id',
            [
              v.vehicleNumber,
              v.brand.trim(),
              v.model.trim(),
              v.vehicleType,
              v.year,
              v.fuelType,
              v.transmission,
              v.pricePerDay,
              'AVAILABLE',
              v.locationId,
            ],
          );
          vehicleId = r.vehicle_id;
        }
        await conn.query('DELETE FROM vehicle_images WHERE vehicle_id=$1', [vehicleId]);
        if (v.imageUrl)
          await conn.query('INSERT INTO vehicle_images(vehicle_id,image_url) VALUES($1,$2)', [
            vehicleId,
            v.imageUrl,
          ]);
        await conn.query('COMMIT');
        res.status(method === 'post' ? 201 : 200).json({ vehicleId });
      } catch (e) {
        await conn.query('ROLLBACK');
        if (e.code === '23505')
          return fail(res, 409, 'That registration number already belongs to a vehicle.');
        if (e.code === '23514')
          return fail(
            res,
            409,
            'This vehicle has upcoming or active reservations and cannot change pickup hubs.',
          );
        throw e;
      } finally {
        conn.release();
      }
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
