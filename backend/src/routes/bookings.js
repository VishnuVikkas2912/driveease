import { Router } from 'express';
import { pool } from '../db/pool.js';
import { asyncHandler, fail, validDateRange, positiveId, pagination } from '../utils/http.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
const router = Router();
const details = `SELECT b.*,v.brand,v.model,v.vehicle_number,v.vehicle_type,v.price_per_day,u.name customer_name,p.payment_status,p.payment_method,p.transaction_reference,t.destination,t.distance_km FROM bookings b JOIN vehicles v ON v.vehicle_id=b.vehicle_id JOIN users u ON u.user_id=b.user_id LEFT JOIN payments p ON p.booking_id=b.booking_id LEFT JOIN trip_details t ON t.booking_id=b.booking_id`;
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const {
      vehicleId,
      pickupDate,
      dropoffDate,
      paymentMethod = 'CARD',
      destination,
      distanceKm,
    } = req.body;
    if (!positiveId(vehicleId)) return fail(res, 400, 'Choose a valid vehicle.');
    if (!validDateRange(pickupDate, dropoffDate))
      return fail(res, 400, 'Choose today or a future pickup and a later return date.');
    if (!['CARD', 'UPI', 'CASH'].includes(paymentMethod))
      return fail(res, 400, 'Choose UPI, card or cash for the simulated payment.');
    if (
      distanceKm != null &&
      (!Number.isFinite(Number(distanceKm)) ||
        Number(distanceKm) < 0 ||
        Number(distanceKm) > 999999)
    )
      return fail(res, 400, 'Distance must be between 0 and 999999 km.');
    if (destination != null && (typeof destination !== 'string' || destination.length > 160))
      return fail(res, 400, 'Keep the destination within 160 characters.');
    const conn = await pool.connect();
    try {
      await conn.query('BEGIN');
      const {
        rows: [vehicle],
      } = await conn.query('SELECT * FROM vehicles WHERE vehicle_id=$1 FOR UPDATE', [vehicleId]);
      if (!vehicle || vehicle.status !== 'AVAILABLE')
        throw Object.assign(new Error('Vehicle is unavailable. Choose another ride.'), {
          status: 409,
        });
      const { rows: conflicts } = await conn.query(
        `SELECT 1 FROM bookings WHERE vehicle_id=$1 AND booking_status IN ('PENDING','APPROVED') AND pickup_date < $2 AND dropoff_date > $3 UNION ALL SELECT 1 FROM maintenance WHERE vehicle_id=$1 AND maintenance_status IN ('SCHEDULED','IN_PROGRESS') AND start_date < $2 AND COALESCE(end_date,DATE '9999-12-31') >= $3 LIMIT 1`,
        [vehicleId, dropoffDate, pickupDate],
      );
      if (conflicts.length)
        throw Object.assign(
          new Error(
            'That ride was reserved for those dates. Try different dates or another vehicle.',
          ),
          { status: 409 },
        );
      const rentalDays = Math.round((Date.parse(dropoffDate) - Date.parse(pickupDate)) / 86400000),
        total = rentalDays * Number(vehicle.price_per_day);
      const {
        rows: [b],
      } = await conn.query(
        "INSERT INTO bookings(user_id,vehicle_id,pickup_date,dropoff_date,total_amount,booking_status) VALUES($1,$2,$3,$4,$5,'PENDING') RETURNING booking_id",
        [req.user.id, vehicleId, pickupDate, dropoffDate, total],
      );
      const ref = `SIM-${Date.now()}-${b.booking_id}`;
      await conn.query(
        "INSERT INTO payments(booking_id,amount,payment_method,payment_status,transaction_reference) VALUES($1,$2,$3,'SUCCESS',$4)",
        [b.booking_id, total, paymentMethod, ref],
      );
      if (destination?.trim())
        await conn.query(
          'INSERT INTO trip_details(booking_id,destination,distance_km,estimated_trip_cost) VALUES($1,$2,$3,$4)',
          [b.booking_id, destination.trim(), distanceKm || null, Math.round((distanceKm || 0) * 8)],
        );
      await conn.query('COMMIT');
      res
        .status(201)
        .json({ bookingId: b.booking_id, totalAmount: total, transactionReference: ref });
    } catch (e) {
      await conn.query('ROLLBACK');
      if (e.status) return fail(res, e.status, e.message);
      throw e;
    } finally {
      conn.release();
    }
  }),
);
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const paging = pagination(req.query, 10);
    if (!paging) return fail(res, 400, 'Invalid page size or offset.');
    const admin = req.user.role === 'ADMIN',
      params = admin ? [] : [req.user.id];
    params.push(paging.limit, paging.offset);
    const { rows } = await pool.query(
      `${details} ${admin ? '' : 'WHERE b.user_id=$1'} ORDER BY b.booking_id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    res.json(rows);
  }),
);
router.patch(
  '/:id/status',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const status = req.body.status;
    if (!positiveId(req.params.id) || !['APPROVED', 'REJECTED'].includes(status))
      return fail(res, 400, 'Choose a valid pending booking and approval status.');
    const { rowCount } = await pool.query(
      "UPDATE bookings SET booking_status=$1 WHERE booking_id=$2 AND booking_status='PENDING'",
      [status, req.params.id],
    );
    if (!rowCount) return fail(res, 409, 'This booking is no longer pending. Refresh the list.');
    res.json({ message: `Booking ${status.toLowerCase()}.` });
  }),
);
router.patch(
  '/:id/cancel',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!positiveId(req.params.id)) return fail(res, 400, 'Invalid booking identifier.');
    const { rowCount } = await pool.query(
      "UPDATE bookings SET booking_status='CANCELLED' WHERE booking_id=$1 AND user_id=$2 AND booking_status='PENDING'",
      [req.params.id, req.user.id],
    );
    if (!rowCount)
      return fail(res, 409, 'Only your pending bookings may be cancelled. Refresh the list.');
    res.json({ message: 'Booking cancelled.' });
  }),
);
export default router;
