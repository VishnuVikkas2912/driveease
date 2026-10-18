import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { initializeEmptyDatabase } from '../src/db/initialize.js';

// Only an isolated schema on a local PostgreSQL instance is allowed.
const databaseUrl = process.env.TEST_DATABASE_URL || 'postgresql://localhost/driveease_local';
const parsed = new URL(databaseUrl);
if (!['localhost', '127.0.0.1'].includes(parsed.hostname))
  throw new Error('Integration tests require local PostgreSQL; production databases are refused.');
const schema = `driveease_test_${process.pid}_${Date.now()}`;
const setup = new pg.Pool({ connectionString: databaseUrl });
process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
process.env.JWT_SECRET = 'integration-only-secret-with-at-least-32-characters';
parsed.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = parsed.toString();
process.env.DATABASE_SSL = 'false';
const { default: app } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const client = request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const day = (n) => {
  const indiaToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  return new Date(Date.parse(indiaToday) + 86400000 * n).toISOString().slice(0, 10);
};
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
    await t.test(
      'production initialization is atomic, restricts client API access and never creates demo accounts',
      async () => {
        const conn = await pool.connect();
        try {
          await initializeEmptyDatabase(conn);
          assert.equal((await conn.query('SELECT COUNT(*) FROM users')).rows[0].count, '0');
          assert.equal((await conn.query('SELECT COUNT(*) FROM vehicles')).rows[0].count, '12');
          const security = (
            await conn.query(
              "SELECT c.relname,c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=current_schema() AND c.relkind='r'",
            )
          ).rows;
          assert.equal(security.length, 9);
          assert(security.every((table) => table.relrowsecurity));
          const publicExec = await conn.query(
            "SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace CROSS JOIN LATERAL aclexplode(p.proacl) acl WHERE n.nspname=current_schema() AND acl.grantee=0 AND acl.privilege_type='EXECUTE'",
          );
          assert.equal(publicExec.rowCount, 0);
          await assert.rejects(initializeEmptyDatabase(conn), /not empty/);
          assert.equal((await conn.query('SELECT COUNT(*) FROM vehicles')).rows[0].count, '12');
        } finally {
          conn.release();
        }
      },
    );
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
      'Vercel proxy headers identify clients without rate-limit configuration errors',
      async () => {
        assert.equal(app.get('trust proxy'), 1);
        assert.equal(app.get('trust proxy fn')('127.0.0.1', 0), true);
        assert.equal(app.get('trust proxy fn')('127.0.0.1', 1), false);
        const errors = [];
        const original = console.error;
        console.error = (...args) => errors.push(args);
        try {
          const result = await client
            .post('/api/auth/register')
            .set('X-Forwarded-For', '203.0.113.40')
            .set('Forwarded', 'for=203.0.113.40;proto=https')
            .send({});
          assert.equal(result.status, 400);
          assert.equal(errors.length, 0);
        } finally {
          console.error = original;
        }
      },
    );
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
    await t.test(
      'expanded fleet and photo migration are idempotent and preserve existing records',
      async () => {
        const summary = await client.get('/api/vehicles/summary');
        assert.equal(summary.status, 200);
        assert.deepEqual(summary.body, { total: 12, cars: 6, bikes: 6 });
        const before = (
          await pool.query(
            'SELECT vehicle_id,price_per_day,status FROM vehicles ORDER BY vehicle_id',
          )
        ).rows;
        await pool.query(
          "UPDATE vehicles SET price_per_day=1234,status='MAINTENANCE' WHERE vehicle_number='KA01DE6104'",
        );
        const custom = (
          await pool.query("SELECT * FROM vehicles WHERE vehicle_number='KA01DE6104'")
        ).rows[0];
        await pool.query(
          await readFile(
            new URL('../../database/migrations/002_fleet_and_photos.sql', import.meta.url),
            'utf8',
          ),
        );
        const after = (await pool.query("SELECT * FROM vehicles WHERE vehicle_number='KA01DE6104'"))
          .rows[0];
        assert.equal(after.vehicle_id, custom.vehicle_id);
        assert.equal(after.price_per_day, '1234.00');
        assert.equal(after.status, 'MAINTENANCE');
        await pool.query('UPDATE vehicles SET price_per_day=$1,status=$2 WHERE vehicle_id=$3', [
          before.at(-1).price_per_day,
          before.at(-1).status,
          custom.vehicle_id,
        ]);
        assert.deepEqual(
          (
            await pool.query(
              'SELECT vehicle_id,price_per_day,status FROM vehicles ORDER BY vehicle_id',
            )
          ).rows,
          before,
        );
        const photos = (await pool.query('SELECT image_url FROM vehicle_images')).rows;
        assert.equal(photos.length, 12);
        assert.equal(new Set(photos.map((p) => p.image_url)).size, 12);
        assert(photos.every((p) => /^\/images\/vehicles\/.+\.webp$/.test(p.image_url)));
        assert.equal((await client.get('/api/vehicles?type=CAR&limit=13')).body.length, 6);
        assert.equal((await client.get('/api/vehicles?type=BIKE&limit=13')).body.length, 6);
      },
    );
    await t.test('registration is atomic, normalized and passwords are hashed', async () => {
      const r = await client
        .post('/api/auth/register')
        .send(registration('TRAVELLER@example.com', 'ka0120200000001'));
      assert.equal(r.status, 201);
      customer = r.body.token;
      const {
        rows: [u],
      } = await pool.query("SELECT * FROM users WHERE email='traveller@example.com'");
      assert.notEqual(u.password_hash, 'Travel@123');
      assert(await bcrypt.compare('Travel@123', u.password_hash));
      assert.equal(
        (
          await pool.query('SELECT license_number FROM driving_licenses WHERE user_id=$1', [
            u.user_id,
          ])
        ).rows[0].license_number,
        'KA0120200000001',
      );
      const duplicate = await client
        .post('/api/auth/register')
        .send(registration('other@example.com', 'KA0120200000001'));
      assert.equal(duplicate.status, 409);
      assert.equal(
        (await pool.query("SELECT * FROM users WHERE email='other@example.com'")).rows.length,
        0,
      );
      other = (
        await client
          .post('/api/auth/register')
          .send(registration('other@example.com', 'KA0120200000002'))
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
          await client.post('/api/auth/register').send({
            ...registration('invalid@example.com', 'KA0120200000003'),
            expiryDate: '2020-02-30',
          })
        ).status,
        400,
      );
      assert.equal(
        (
          await client
            .post('/api/auth/register')
            .send({ ...registration('invalid@example.com', 'KA0120200000003'), password: 'x' })
        ).status,
        400,
      );
      assert.equal(
        (await client.get('/api/auth/me').set(auth(customer))).body.email,
        'traveller@example.com',
      );
    });
    await t.test(
      'direct API requests cannot bypass licence structure and date checks or create partial accounts',
      async () => {
        const before = (await pool.query('SELECT COUNT(*) FROM users')).rows[0].count;
        const invalid = [
          { licenseNumber: 'KA-0120200000003' },
          { licenseNumber: 'KA01 20200000003' },
          { licenseNumber: ' KA0120200000003' },
          { licenseNumber: 'KA0120200000003\n' },
          { licenseNumber: 'KA012020000000' },
          { licenseNumber: 'ZZ0120200000003' },
          { licenseNumber: 'KA01ABCD0000003' },
          { licenseNumber: 'KA0118990000003' },
          { licenseNumber: `KA01${Number(day(0).slice(0, 4)) + 1}0000003` },
          { licenseNumber: 'KA0120210000003' },
          { licenseNumber: { value: 'KA0120200000003' } },
          { issueDate: '2020-02-30' },
          { issueDate: day(1) },
          { expiryDate: '2020-01-01' },
          { expiryDate: day(-1) },
        ];
        for (const values of invalid) {
          const result = await client
            .post('/api/auth/register')
            .send({ ...registration('invalid@example.com', 'KA0120200000003'), ...values });
          assert.equal(result.status, 400, JSON.stringify(values));
          assert(Object.keys(result.body.errors).length > 0);
        }
        assert.equal((await pool.query('SELECT COUNT(*) FROM users')).rows[0].count, before);
        assert.equal(
          (await pool.query('SELECT COUNT(*) FROM driving_licenses')).rows[0].count,
          '2',
        );
      },
    );
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
