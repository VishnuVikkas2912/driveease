import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import request from 'supertest';
import bcrypt from 'bcryptjs';

// Only an isolated schema on a local PostgreSQL instance is allowed.
const databaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://localhost/driveease_local';
const parsed = new URL(databaseUrl);
if (!['localhost', '127.0.0.1'].includes(parsed.hostname))
  throw new Error('Integration tests require local PostgreSQL; production databases are refused.');
const schema = `driveease_test_${process.pid}_${Date.now()}`;
const setup = new pg.Pool({ connectionString: databaseUrl });
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'integration-only-secret-with-at-least-32-characters';
parsed.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = parsed.toString();
process.env.DATABASE_SSL = 'false';
const { default: app } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const client = request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const day = (n) => new Date(Date.now() + 86400000 * n).toISOString().slice(0, 10);
const registration = (email, license) => ({
  name: 'Integration Traveller',
  email,
  password: 'Travel@123',
  licenseNumber: license,
  issueDate: '2020-01-01',
  expiryDate: '2040-01-01',
});

test('DriveEase PostgreSQL and HTTP integration', async (t) => {
  await setup.query(`CREATE SCHEMA ${schema}`);
  try {
    await pool.query(await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8'));
    await pool.query(await readFile(new URL('../../database/seed.sql', import.meta.url), 'utf8'));
    let customer, other, admin, bookingId;
    const booking = {
      vehicleId: 1,
      pickupDate: day(10),
      dropoffDate: day(13),
      paymentMethod: 'UPI',
      destination: 'Coorg',
      distanceKm: 200,
    };
    await t.test('health and readiness verify API and real database', async () => {
      assert.equal((await client.get('/api/health')).status, 200);
      assert.deepEqual((await client.get('/api/ready')).body, {
        status: 'ok',
        database: 'connected',
      });
    });
    await t.test(
      'same-origin deployment and local proxy allow requests; unknown origins are rejected',
      async () => {
        assert.equal(
          (
            await client
              .get('/api/health')
              .set('Host', 'driveease.example.com')
              .set('Origin', 'https://driveease.example.com')
          ).status,
          200,
        );
        assert.equal(
          (await client.get('/api/health').set('Origin', 'http://127.0.0.1:5173')).status,
          200,
        );
        assert.equal(
          (await client.get('/api/health').set('Origin', 'https://untrusted.example')).status,
          403,
        );
      },
    );
    await t.test('registration is atomic, normalized and passwords are hashed', async () => {
      const r = await client
        .post('/api/auth/register')
        .send(registration('TRAVELLER@example.com', 'TEST-LICENSE-A'));
      assert.equal(r.status, 201);
      customer = r.body.token;
      const {
        rows: [u],
      } = await pool.query("SELECT * FROM users WHERE email='traveller@example.com'");
      assert.notEqual(u.password_hash, 'Travel@123');
      assert(await bcrypt.compare('Travel@123', u.password_hash));
      const duplicate = await client
        .post('/api/auth/register')
        .send(registration('other@example.com', 'TEST-LICENSE-A'));
      assert.equal(duplicate.status, 409);
      assert.equal(
        (await pool.query("SELECT * FROM users WHERE email='other@example.com'")).rows.length,
        0,
      );
      other = (
        await client
          .post('/api/auth/register')
          .send(registration('other@example.com', 'TEST-LICENSE-B'))
      ).body.token;
      admin = (
        await client
          .post('/api/auth/login')
          .send({ email: 'admin@example.com', password: 'Admin@123' })
      ).body.token;
      assert(admin, 'Seed admin login must work');
    });
    await t.test('invalid auth and licence values are rejected without writes', async () => {
      assert.equal(
        (
          await client
            .post('/api/auth/login')
            .send({ email: 'traveller@example.com', password: 'wrong' })
        ).status,
        401,
      );
      assert.equal(
        (
          await client
            .post('/api/auth/register')
            .send({ ...registration('invalid@example.com', 'TEST-C'), expiryDate: '2020-02-30' })
        ).status,
        400,
      );
      assert.equal(
        (
          await client
            .post('/api/auth/register')
            .send({ ...registration('invalid@example.com', 'TEST-C'), password: 'x' })
        ).status,
        400,
      );
      assert.equal(
        (await client.get('/api/auth/me').set(auth(customer))).body.email,
        'traveller@example.com',
      );
    });
    await t.test(
      'catalog filtering, pagination, date validation and parameterized injection defense',
      async () => {
        const r = await client.get('/api/vehicles?type=BIKE&limit=1');
        assert.equal(r.status, 200);
        assert.equal(r.body.length, 1);
        assert.equal(r.body[0].vehicle_type, 'BIKE');
        assert.equal((await client.get('/api/vehicles?limit=-1')).status, 400);
        assert.equal(
          (await client.get('/api/vehicles?pickupDate=bad&dropoffDate=bad')).status,
          400,
        );
        assert.equal(
          (await client.get('/api/vehicles').query({ brand: "' OR 1=1 --" })).body.length,
          0,
        );
        assert.equal((await client.get('/api/vehicles/unknown')).status, 400);
        assert.equal((await client.get('/api/vehicles/9999')).status, 404);
      },
    );
    await t.test('authentication and admin authorization enforced on server', async () => {
      assert.equal((await client.get('/api/bookings')).status, 401);
      assert.equal((await client.get('/api/admin/dashboard').set(auth(customer))).status, 403);
      assert.equal(
        (
          await client
            .patch('/api/bookings/1/status')
            .set(auth(customer))
            .send({ status: 'APPROVED' })
        ).status,
        403,
      );
      assert.equal((await client.get('/api/bookings').set(auth('bad-token'))).status, 401);
    });
    await t.test(
      'booking total is server calculated; booking, payment and trip persist together',
      async () => {
        const r = await client
          .post('/api/bookings')
          .set(auth(customer))
          .send({ ...booking, totalAmount: 1 });
        assert.equal(r.status, 201);
        assert.equal(r.body.totalAmount, 6600);
        bookingId = r.body.bookingId;
        const {
          rows: [b],
        } = await pool.query(
          'SELECT b.total_amount,p.amount,p.transaction_reference,t.destination FROM bookings b JOIN payments p USING(booking_id) JOIN trip_details t USING(booking_id) WHERE b.booking_id=$1',
          [bookingId],
        );
        assert.equal(Number(b.amount), 6600);
        assert.equal(b.destination, 'Coorg');
        assert.match(b.transaction_reference, /^SIM-/);
      },
    );
    await t.test(
      'overlaps excluded, adjacent rentals allowed, customer history isolated',
      async () => {
        const r = await client
          .get('/api/vehicles')
          .query({ pickupDate: day(11), dropoffDate: day(12) });
        assert(!r.body.some((v) => v.vehicle_id === '1'));
        assert.equal(
          (await client.post('/api/bookings').set(auth(other)).send(booking)).status,
          409,
        );
        assert.equal((await client.get('/api/bookings').set(auth(other))).body.length, 0);
        assert.equal(
          (await client.patch(`/api/bookings/${bookingId}/cancel`).set(auth(other))).status,
          409,
        );
        assert.equal(
          (
            await client
              .post('/api/bookings')
              .set(auth(other))
              .send({ ...booking, pickupDate: day(13), dropoffDate: day(14) })
          ).status,
          201,
        );
      },
    );
    await t.test('two simultaneous reservations have exactly one winner', async () => {
      const payload = { ...booking, vehicleId: 2, pickupDate: day(20), dropoffDate: day(22) };
      const r = await Promise.all([
        client.post('/api/bookings').set(auth(customer)).send(payload),
        client.post('/api/bookings').set(auth(other)).send(payload),
      ]);
      assert.deepEqual(r.map((v) => v.status).sort(), [201, 409]);
      const {
        rows: [count],
      } = await pool.query('SELECT COUNT(*)::int count FROM bookings WHERE vehicle_id=2');
      assert.equal(count.count, 1);
    });
    await t.test('failed payment insertion rolls back booking', async () => {
      await pool.query(
        `CREATE FUNCTION fail_test_payment() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test payment error'; END; $$; CREATE TRIGGER test_payment_error BEFORE INSERT ON payments FOR EACH ROW EXECUTE FUNCTION fail_test_payment();`,
      );
      const before = Number(
        (await pool.query('SELECT COUNT(*) count FROM bookings')).rows[0].count,
      );
      assert.equal(
        (
          await client
            .post('/api/bookings')
            .set(auth(customer))
            .send({ ...booking, vehicleId: 3 })
        ).status,
        500,
      );
      assert.equal(
        Number((await pool.query('SELECT COUNT(*) count FROM bookings')).rows[0].count),
        before,
      );
      await pool.query(
        'DROP TRIGGER test_payment_error ON payments; DROP FUNCTION fail_test_payment();',
      );
    });
    await t.test('invalid dates, method and distance are rejected before mutation', async () => {
      for (const values of [
        { pickupDate: '2026-02-30' },
        { dropoffDate: booking.pickupDate },
        { paymentMethod: 'BANK' },
        { distanceKm: -4 },
        { vehicleId: '1 OR 1=1' },
      ])
        assert.equal(
          (
            await client
              .post('/api/bookings')
              .set(auth(customer))
              .send({ ...booking, ...values })
          ).status,
          400,
        );
    });
    await t.test('approval cannot revive cancelled or approved reservations', async () => {
      assert.equal(
        (
          await client
            .patch(`/api/bookings/${bookingId}/status`)
            .set(auth(admin))
            .send({ status: 'APPROVED' })
        ).status,
        200,
      );
      assert.equal(
        (
          await client
            .patch(`/api/bookings/${bookingId}/status`)
            .set(auth(admin))
            .send({ status: 'REJECTED' })
        ).status,
        409,
      );
      assert.equal(
        (await client.patch(`/api/bookings/${bookingId}/cancel`).set(auth(customer))).status,
        409,
      );
      const r = await client
        .post('/api/bookings')
        .set(auth(customer))
        .send({ ...booking, vehicleId: 4 });
      assert.equal(r.status, 201);
      assert.equal(
        (await client.patch(`/api/bookings/${r.body.bookingId}/cancel`).set(auth(customer))).status,
        200,
      );
      assert.equal(
        (
          await client
            .patch(`/api/bookings/${r.body.bookingId}/status`)
            .set(auth(admin))
            .send({ status: 'APPROVED' })
        ).status,
        409,
      );
    });
    await t.test(
      'maintenance trigger removes vehicle and returns only after all service completes',
      async () => {
        const payload = {
          vehicleId: 3,
          type: 'Service',
          startDate: day(2),
          endDate: day(3),
          cost: 500,
        };
        const a = await client.post('/api/admin/maintenance').set(auth(admin)).send(payload),
          b = await client
            .post('/api/admin/maintenance')
            .set(auth(admin))
            .send({ ...payload, type: 'Inspection' });
        assert.equal(a.status, 201);
        assert.equal(b.status, 201);
        assert.equal(
          (await client.get('/api/vehicles')).body.some((v) => v.vehicle_id === '3'),
          false,
        );
        assert.equal(
          (
            await client
              .post('/api/bookings')
              .set(auth(customer))
              .send({ ...booking, vehicleId: 3 })
          ).status,
          409,
        );
        await client
          .patch(`/api/admin/maintenance/${a.body.maintenanceId}`)
          .set(auth(admin))
          .send({ status: 'COMPLETED' });
        assert.equal((await client.get('/api/vehicles/3')).body.status, 'MAINTENANCE');
        await client
          .patch(`/api/admin/maintenance/${b.body.maintenanceId}`)
          .set(auth(admin))
          .send({ status: 'COMPLETED' });
        assert.equal((await client.get('/api/vehicles/3')).body.status, 'AVAILABLE');
        assert.equal(
          (
            await client
              .post('/api/admin/maintenance')
              .set(auth(admin))
              .send({ ...payload, cost: -1 })
          ).status,
          400,
        );
      },
    );
    await t.test(
      'dashboard, stored history function and bounded lists use actual joins',
      async () => {
        const r = await client.get('/api/admin/dashboard').set(auth(admin));
        assert.equal(r.status, 200);
        assert.equal(r.body.counts.customers, 2);
        assert(r.body.utilization.length <= 6);
        assert.equal((await client.get('/api/bookings?limit=1').set(auth(admin))).body.length, 1);
        assert.equal(
          (await client.get('/api/admin/maintenance?limit=1').set(auth(admin))).body.length,
          1,
        );
        const id = (
          await pool.query("SELECT user_id FROM users WHERE email='traveller@example.com'")
        ).rows[0].user_id;
        assert(
          (await pool.query('SELECT * FROM customer_booking_history($1)', [id])).rows.length > 0,
        );
      },
    );
  } finally {
    await pool.end();
    await setup.query(`DROP SCHEMA ${schema} CASCADE`);
    await setup.end();
  }
});
