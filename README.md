# DriveEase

A full-stack car and bike rental project with customer bookings, simulated payments, fleet reports and maintenance management. React/Vite talks to an Express API; only the server connects to PostgreSQL (local or Supabase).

## Administration and pickup locations

Open `/admin` (also linked in the footer) and sign in with an explicitly provisioned administrator account. The dashboard includes city fleet counts, reservation approvals and maintenance. **Fleet & pickup hubs** supports adding vehicles, editing registration/specifications/rates/model photos, creating pickup hubs, and moving unreserved units between hubs. Lists use server pagination and restorable hub filters. Edit requests carry a revision to reject stale changes; existing reservation prices are preserved.

Each physical vehicle has exactly one assigned hub. Catalogue searches filter by hub, and the booking API requires the hub to match the locked vehicle row. Pickup and return use the same hub; cross-city drop-offs are not supported. Pending/approved reservations block relocation until their rental period has ended (India calendar dates). New bookings retain an immutable hub/address snapshot. Earlier bookings without location data remain explicitly marked as not recorded; the first city allocation does not invent historical pickup details. Unassigned vehicles cannot receive new bookings. A valid stored licence covering the rental dates is required, including for an admin attempting to rent.

Migrations `004_vehicle_locations.sql` and generated `005_demo_city_fleet.sql` add the location model and the authorized demo allocation without deleting existing users or reservations. Run `node scripts/migrate-locations.js --env-file /path/to/private.env` before deploying this version to an existing database. The generated fleet is ten units in each city; the demo addresses must be replaced by real collection details by adding real hubs and assigning vehicles. Reapplying the migration preserves deliberate admin allocations.

For an existing registered account, an operator can use the migration runner's explicit `--admin-email` option. To create an operations-only admin without a fabricated licence, use `node scripts/create-admin.js --env-file /path/to/private.env --email admin@your-domain.example < /path/to/private-password-file`. Passwords are bcrypt-hashed and never included in source, CLI arguments or logs. Existing accounts are never overwritten by this provisioning script. Production uses the user-designated account; the development seed credentials below are local only.

## Run locally

Use Node.js 24 LTS, npm and PostgreSQL. From the repository root:

```sh
npm run install:all
createdb driveease_local
cp backend/.env.example backend/.env
npm run db:initialize
psql driveease_local -v ON_ERROR_STOP=1 -f database/seed.sql
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
npm run test:fleet
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

3. For a new empty database, run `npm run db:initialize -- --env-file /path/to/private.env`. For an existing deployment, apply the additive location migrations with `node scripts/migrate-locations.js --env-file /path/to/private.env`. Never rerun `schema.sql` on an existing initialized database.
4. Deploy through Vercel, or run `npx vercel` from the repository root after `npx vercel login`. Inspect the preview before promoting with `npx vercel --prod`.
5. Verify `/api/health` returns `status: ok` and `/api/ready` also returns `database: connected`. Refresh `/vehicles/1`, sign in, create a test booking, and check it as an administrator before accepting the release.

Leave `VITE_API_URL` unset for this root deployment. `CLIENT_URL` is only needed for a deliberately separate frontend origin. `.vercelignore` excludes local environment files and test evidence.

### Existing two-project deployment

You may retain `backend` and `frontend` as separate Vercel project roots. Set backend `DATABASE_URL`, `DATABASE_SSL=true`, `JWT_SECRET`, and `CLIENT_URL` to the exact frontend origin. Set frontend `VITE_API_URL=https://your-api.vercel.app/api`. The frontend has its own SPA rewrite configuration. Redeploy both after changing settings.

### A new, empty Supabase database

Use a project you own. This app connects through server-side PostgreSQL, so the Supabase Data API can remain disabled. Store the transaction-pooler URI and `DATABASE_SSL=true` in a local ignored environment file, then run:

```sh
npm run db:initialize -- --env-file .vercel/driveease-database.env
```

Initialization refuses a non-empty schema. It creates the schema, 20-unit catalogue across Delhi and Chennai, and server-only access controls together in a transaction. It creates no accounts or development administrator. Register your own account after deployment; administrator access must be assigned deliberately. Existing users and bookings require an export from their database owner.

Migration `003_server_only_access.sql` enables row-level security, makes views use caller permissions and revokes direct client-role access to DriveEase tables, views and functions. The Express server connects as the project database owner and enforces its own JWT authorization. Apply this migration only to installations using that server connection model.

### Current deployment status

Live at [driveease-phi.vercel.app](https://driveease-phi.vercel.app), deployed to `medhanshs-projects-1ac9d87f/driveease`. The Express API and user-owned Supabase database run in Mumbai. Database TLS is enforced and its certificate is verified; connection credentials and the signing secret are stored as Vercel secrets. The fleet has 20 physical units: 10 cars and 10 bikes, split into 10 units per city in Delhi and Chennai. The original database was inaccessible and was not modified. Local development keeps its own PostgreSQL configuration; production connection settings stay in ignored local Vercel files.

## Data model and behavior

Nine normalized tables: users, driving_licenses, vehicles, vehicle_images, bookings, payments, maintenance, trip_details and reviews. The schema demonstrates keys, CHECK/UNIQUE constraints, indexed availability lookups, joins, aggregate views, a maintenance trigger and the `customer_booking_history` SQL function.

A booking transaction locks its vehicle, checks active bookings and maintenance, computes the amount from the database daily rate, and creates the booking, simulated payment and optional trip together. Date intervals for rentals are `[pickup, return)`, so back-to-back rentals are allowed. Two concurrent overlapping requests cannot both succeed. Rejected or cancelled bookings cannot be revived by approval.

Existing maintenance behavior is preserved: any scheduled/in-progress service takes the vehicle out of the available fleet. Completing the final active service restores availability. Scheduling does not cancel existing reservations; review them first. The UI provides a confirmation before scheduling or completing service.

Registration checks compact Indian driving-licence numbers in the form and API using `shared/driving-license.js`. It requires a recognised current/historical state code, a two-digit RTO code (or three-digit AP/TS/TG office code), four-digit issue year and seven-digit serial, with no spaces, hyphens or other punctuation. Letters are stored uppercase. The embedded year must be between 1900 and the current year and cannot follow the supplied issue date; renewed cards can have a later issue date. Real calendar dates and unexpired licences are required. This is structural validation, not proof of government issuance, ownership, vehicle entitlement or suspension status. `license_status=VALID` reflects the project's existing declared validity model, not government verification. Genuine verification requires an authorised provider integration; no provider is currently connected. Existing licence rows are preserved.

Government reference: [Parivahan licence details service](https://parivahan.gov.in/parivahan//en/content/license-registration-details). No registration details are sent to that service by this app.

Payments are simulated, with no real card or UPI collection and no real charges/refunds. Reports aggregate successful simulation records, including those associated with subsequently cancelled bookings, matching the existing project behavior. The 20 physical units use 12 distinct, credited model photographs. Shared models in different cities have different registration numbers and database IDs. These are model reference photos, with colours/trim allowed to vary from the specific rental unit. See the in-app Vehicle photo credits page for source and license links. Most images are Creative Commons photographs; the Ather 450X image is official manufacturer media.

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

Road photograph: [Unsplash](https://images.unsplash.com/photo-1469854523086-cc02fe5d8800) (asset ID `photo-1469854523086-cc02fe5d8800`, downloaded to `frontend/public/images/open-road.jpg`). Vehicle images are self-hosted WebP files, with source/author/license metadata in `database/fleet.json` and the in-app Vehicle photo credits page. Manrope and Barlow Condensed are self-hosted through Fontsource under OFL; icons use lucide-react under ISC.

## Updating the local fleet

`database/fleet.json` owns the 12 model-photo pairings; `database/fleet-units.json` owns the 20 demo physical units and their initial city allocation. After editing them, run `npm run sync:fleet` to generate migrations and credits. `npm run test:fleet` verifies unique unit registrations, ten units per city, generated files and distinct model photos.

For an existing local installation, apply the update with:

```sh
psql driveease_local -v ON_ERROR_STOP=1 -f database/migrations/002_fleet_and_photos.sql
```

This migration can be rerun: it inserts missing demo vehicles and changes their primary photo; it preserves existing IDs, pricing, availability, bookings and additional gallery photos. Do not rerun schema.sql or the development admin seed on an existing hosted database.
