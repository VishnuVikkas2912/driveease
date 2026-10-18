# DriveEase

A full-stack car and bike rental project with customer bookings, simulated payments, fleet reports and maintenance management. React/Vite talks to an Express API; only the server connects to PostgreSQL (local or Supabase).

## Run locally

Use Node.js 24 LTS, npm and PostgreSQL. From the repository root:

```sh
npm run install:all
createdb driveease_local
psql driveease_local -v ON_ERROR_STOP=1 -f database/schema.sql
psql driveease_local -v ON_ERROR_STOP=1 -f database/seed.sql
cp backend/.env.example backend/.env
```

Set a random `JWT_SECRET` of at least 32 characters in `backend/.env`. Keep the example local `DATABASE_URL`, or configure your own database. Hosted Supabase connections require `DATABASE_SSL=true`; certificate validation stays enabled. `DATABASE_CA` can supply the provider's PEM certificate if required.

Run in separate terminals:

```sh
npm run dev:backend
npm run dev:frontend
```

Open http://localhost:5173 (or the port Vite prints). Vite proxies `/api` to port 5001, so no frontend environment file is needed. The local database already created during this redesign is `driveease_local`.

The seed is **development-only**: `admin@example.com` / `Admin@123`. Create a customer through registration. Do not load that known admin account into a public production database.

## Verify

```sh
npm test
npm run build
npm run format:check
npm run test:design
npm --prefix backend audit
npm --prefix frontend audit
```

Backend integration tests create and drop their own uniquely named PostgreSQL schema, run the actual schema and seed, and exercise HTTP routes with Supertest. They refuse non-local database hosts. Optional `TEST_DATABASE_URL` must point to a **local** PostgreSQL database; default is `postgresql://localhost/driveease_local`. Never point tests at production.

Coverage includes registration rollback and hashing, authorization and customer isolation, same-origin/CORS handling, filters and pagination, simultaneous reservations, overlapping and adjacent rentals, transactional payment rollback, pending-only lifecycle changes, maintenance triggers, reports and stored history. Frontend tests cover field semantics, password visibility, validation focus, duplicate-submit prevention, stale-request cancellation, date rules and axe accessibility checks. jsdom accessibility checks exclude color contrast; browser contrast and responsive review are separate.

Visual decisions and tokens: [DESIGN.md](DESIGN.md). Shared behavior and native control ownership: [UX-CONTRACT.md](UX-CONTRACT.md). Verification evidence: [verification.md](verification.md).

## Deploy on Vercel

### Recommended: one project, same origin

The root `vercel.json` builds `frontend/dist`, routes `/api/*` to `api/index.js`, and handles React deep links. This avoids separate frontend/API origins. The Express handler imports the existing backend; PostgreSQL credentials never enter the browser bundle.

1. Import this repository in Vercel with **Root Directory left at the repository root**. Select the **Other** framework preset so Vite auto-detection does not override the root configuration.
2. Add server environment variables for the intended Preview/Production environment:

   | Variable       | Value                                                              |
   | -------------- | ------------------------------------------------------------------ |
   | `DATABASE_URL` | Supabase transaction pooler URI (from your Supabase Connect panel) |
   | `DATABASE_SSL` | `true`                                                             |
   | `JWT_SECRET`   | Unique random value, at least 32 characters                        |
   | `DATABASE_CA`  | Provider PEM certificate, only when needed                         |

3. For a new empty database, run `database/schema.sql` in the Supabase SQL editor. It creates tables **inside the existing database**, not a new database. Do not rerun it on an existing initialized database. Existing installations can apply the additive read indexes in `database/migrations/001_read_indexes.sql`; no row or column migration is required.
4. Deploy through Vercel, or run `npx vercel` from the repository root after `npx vercel login`. Inspect the preview before promoting with `npx vercel --prod`.
5. Verify `/api/health` returns `status: ok` and `/api/ready` also returns `database: connected`. Refresh `/vehicles/1`, sign in, create a test booking, and check it as an administrator before accepting the release.

Leave `VITE_API_URL` unset for this root deployment. `CLIENT_URL` is only needed for a deliberately separate frontend origin. `.vercelignore` excludes local environment files and test evidence.

### Existing two-project deployment

You may retain `backend` and `frontend` as separate Vercel project roots. Set backend `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, and `CLIENT_URL` to the exact frontend origin. Set frontend `VITE_API_URL=https://your-api.vercel.app/api`. The frontend has its own SPA rewrite configuration. Redeploy both after changing settings.

### Current deployment status

The local redesign is ready for review. A live deployment requires Vercel account authentication and the intended hosted database settings. No production database has been changed, and the original public website has not been replaced.

## Data model and behavior

Nine normalized tables: users, driving_licenses, vehicles, vehicle_images, bookings, payments, maintenance, trip_details and reviews. The schema demonstrates keys, CHECK/UNIQUE constraints, indexed availability lookups, joins, aggregate views, a maintenance trigger and the `customer_booking_history` SQL function.

A booking transaction locks its vehicle, checks active bookings and maintenance, computes the amount from the database daily rate, and creates the booking, simulated payment and optional trip together. Date intervals for rentals are `[pickup, return)`, so back-to-back rentals are allowed. Two concurrent overlapping requests cannot both succeed. Rejected or cancelled bookings cannot be revived by approval.

Existing maintenance behavior is preserved: any scheduled/in-progress service takes the vehicle out of the available fleet. Completing the final active service restores availability. Scheduling does not cancel existing reservations; review them first. The UI provides a confirmation before scheduling or completing service.

Payments are simulated, with no real card or UPI collection and no real charges/refunds. Reports aggregate successful simulation records, including those associated with subsequently cancelled bookings, matching the existing project behavior. Seed vehicle photographs are illustrative and are labelled accordingly. Replace them with actual fleet photographs before a customer-facing release.

## API

| Area          | Endpoint                                                              | Purpose                                  |
| ------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| Health        | `GET /api/health`, `GET /api/ready`                                   | Process / database readiness             |
| Auth          | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` | Customer registration and JWT sessions   |
| Fleet         | `GET /api/vehicles`, `GET /api/vehicles/:id`                          | Available vehicles / detail and reviews  |
| Bookings      | `POST /api/bookings`, `GET /api/bookings`                             | Transactional booking and scoped history |
| Booking state | `PATCH /api/bookings/:id/status`, `PATCH /api/bookings/:id/cancel`    | Admin decision / customer cancellation   |
| Operations    | `GET /api/admin/dashboard`                                            | Counts, revenue and utilization          |
| Maintenance   | `GET/POST /api/admin/maintenance`, `PATCH /api/admin/maintenance/:id` | Schedule and track service               |

Lists accept `limit` (1–101) and nonnegative `offset`. Vehicles accept type, brand, fuel, transmission, maxPrice and paired pickupDate/dropoffDate filters. The catalog uses Load more; bookings and service records use server pagination. Authentication routes have a basic per-instance rate limiter; distributed production abuse protection should be configured at the hosting edge if needed.

## Asset credits

Road photograph: [Unsplash](https://images.unsplash.com/photo-1469854523086-cc02fe5d8800) (asset ID `photo-1469854523086-cc02fe5d8800`, downloaded to `frontend/public/images/open-road.jpg`). Existing seed vehicle images remain hosted on Unsplash. Manrope and Barlow Condensed are self-hosted through Fontsource under OFL; icons use lucide-react under ISC.
