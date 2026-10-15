# DriveEase

DriveEase is a full-stack vehicle rental, booking and maintenance management system. Customers can create an account, browse cars and bikes, choose rental dates, make a simulated payment, and track bookings. Administrators can approve bookings, schedule maintenance, and monitor revenue and vehicle usage.

## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Frontend | React, Vite, React Router | Responsive customer and admin interface |
| Backend | Node.js, Express | REST API and business rules |
| Database | Supabase PostgreSQL | Hosted relational data storage and reporting |
| Authentication | JWT, bcryptjs | Secure password hashing and role-based access |
| Database client | pg | Parameterized PostgreSQL queries and transactions |

## Features

### Customer

- Register with driving-licence details.
- Log in securely with JWT authentication.
- Browse and filter available cars and bikes.
- Select pickup and drop-off dates.
- Receive an availability check that considers active bookings and maintenance records.
- Create a booking with a simulated UPI, card, or cash payment.
- View booking and payment status, and cancel pending bookings.
- Optionally save a destination and trip distance.

### Administrator

- View customer, booking, revenue, and vehicle-utilization metrics.
- Approve or reject pending bookings.
- Schedule and track vehicle maintenance.
- Automatically remove scheduled-maintenance vehicles from availability.
- View maintenance history and utilization information.

## Application Architecture

```text
React / Vite frontend
        |
        | HTTP REST requests
        v
Node.js / Express API
        |
        | parameterized SQL queries and transactions
        v
Supabase PostgreSQL database
```

The frontend never connects to Supabase directly. The Express API performs validation, authentication, availability checks, and database operations.

## Database Design

The schema contains nine normalized tables:

| Table | Purpose |
| --- | --- |
| `users` | Customer and administrator accounts |
| `driving_licenses` | Customer licence information; one licence per user |
| `vehicles` | Cars and bikes with pricing, type, and availability status |
| `vehicle_images` | Image URL records for vehicles |
| `bookings` | Rental dates, totals, and booking status |
| `payments` | Simulated payment records and transaction references |
| `maintenance` | Scheduled and completed vehicle services |
| `trip_details` | Optional destination and distance details for a booking |
| `reviews` | Customer ratings and comments for vehicles |

### DBMS Concepts Demonstrated

- Primary keys, foreign keys, `UNIQUE`, `NOT NULL`, `CHECK`, and default constraints.
- Indexed booking and maintenance date lookups.
- Multi-table `JOIN` queries for booking details and reports.
- Aggregate queries using `COUNT`, `SUM`, and `GROUP BY`.
- A `booking_details` view and a `vehicle_utilization` view.
- Maintenance triggers that update a vehicle to `MAINTENANCE` and return it to `AVAILABLE` only when all active maintenance is complete.
- A `customer_booking_history` stored procedure.
- A database transaction that creates the booking and payment together, rolling back when availability validation fails.

## Project Structure

```text
driveease/
├── frontend/                 # React/Vite web application
│   └── src/
│       ├── main.jsx          # Pages, UI flow, routing, booking forms
│       ├── services/api.js   # API client
│       └── styles.css        # Responsive visual design
├── backend/                  # Express REST API
│   └── src/
│       ├── db/pool.js        # PostgreSQL connection pool
│       ├── middleware/       # JWT and admin authorization middleware
│       ├── routes/           # Auth, vehicle, booking, and admin APIs
│       └── server.js         # API entry point
├── database/
│   ├── schema.sql            # Tables, views, triggers, procedure, indexes
│   └── seed.sql              # Development vehicles and administrator account
└── README.md
```

## Local Setup

### Prerequisites

- Node.js 20 or newer
- A Supabase account and project
- npm

### 1. Create the database

Create a Supabase project, open its SQL Editor, then run these files in order:

1. `database/schema.sql`
2. `database/seed.sql`

The schema creates the `driveease` database automatically.

### 2. Configure environment variables

Copy the example files:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

Update `backend/.env` with the Supabase pooled connection string from **Connect**:

```env
PORT=5001
DATABASE_URL=postgresql://postgres.your_project:your_password@aws-0-region.pooler.supabase.com:6543/postgres
JWT_SECRET=replace_this_with_a_long_random_secret
```

### 3. Install dependencies

From the project root:

```powershell
npm run install:all
```

### 4. Start the API

```powershell
cd backend
npm run dev
```

The API runs on `http://localhost:5001`.

### 5. Start the frontend

In another terminal:

```powershell
cd frontend
npm run dev
```

Open the address Vite prints in the terminal, usually `http://localhost:5173`. Vite may choose `5174` if port `5173` is in use.

## Vercel Deployment

Deploy the backend and frontend as two Vercel projects from the same GitHub repository. This keeps the Supabase connection string on the server and out of browser code.

### 1. Deploy the API

1. In Vercel, choose **Add New → Project** and import this GitHub repository.
2. Set **Root Directory** to `backend`.
3. Add these environment variables for Production, Preview, and Development:

```text
DATABASE_URL=<your Supabase Transaction Pooler URI>
JWT_SECRET=<a long random secret>
CLIENT_URL=https://<your-frontend-project>.vercel.app
```

4. Deploy. Confirm `https://<your-api-project>.vercel.app/api/health` returns `{ "status": "ok" }`.

### 2. Deploy the frontend

1. Create another Vercel project from the same repository.
2. Set **Root Directory** to `frontend`.
3. Set the environment variable below before deploying:

```text
VITE_API_URL=https://<your-api-project>.vercel.app/api
```

4. Deploy and open the resulting Vercel URL.

After the frontend URL is known, update the backend `CLIENT_URL` variable to that exact URL and redeploy the backend. Never add `DATABASE_URL`, the Supabase password, or `JWT_SECRET` to frontend variables.

## Development Account

After loading `database/seed.sql`, use this account for the admin workflow:

```text
Email:    admin@example.com
Password: Admin@123
```

This is a development-only account. Change the password and JWT secret before any real deployment.

## REST API Overview

| Area | Endpoint | Description |
| --- | --- | --- |
| Health | `GET /api/health` | Confirms that the API is running |
| Authentication | `POST /api/auth/register` | Creates a customer and driving licence |
| Authentication | `POST /api/auth/login` | Returns a JWT session token |
| Profile | `GET /api/auth/me` | Returns the current user profile |
| Vehicles | `GET /api/vehicles` | Lists vehicles with type/date filters |
| Vehicles | `GET /api/vehicles/:id` | Returns vehicle details and reviews |
| Bookings | `POST /api/bookings` | Checks availability; creates booking and payment transactionally |
| Bookings | `GET /api/bookings` | Lists a customer’s bookings or all bookings for admins |
| Bookings | `PATCH /api/bookings/:id/status` | Admin approves or rejects a booking |
| Bookings | `PATCH /api/bookings/:id/cancel` | Customer cancels a pending booking |
| Admin | `GET /api/admin/dashboard` | Revenue, customer, availability, and utilization metrics |
| Admin | `POST /api/admin/maintenance` | Schedules maintenance and changes availability |
| Admin | `GET /api/admin/maintenance` | Lists maintenance records |

## Booking Availability Logic

Before creating a booking, the API checks that the vehicle:

1. Exists and has `AVAILABLE` status.
2. Has no overlapping `PENDING` or `APPROVED` booking.
3. Has no overlapping `SCHEDULED` or `IN_PROGRESS` maintenance record.

If all checks pass, the API calculates the rental cost, inserts the booking, inserts the payment, optionally adds trip details, and commits the transaction. Any error rolls the transaction back.

## Demo Flow

1. Register a new customer with valid licence details.
2. Browse vehicles and select future rental dates.
3. Confirm a booking and simulated payment.
4. Log in as the administrator.
5. Approve the customer booking.
6. Schedule maintenance for a different vehicle.
7. View revenue and vehicle utilization in the admin dashboard.

## Team of Three Responsibilities

| Member | Primary responsibility |
| --- | --- |
| Frontend developer | React pages, UI design, customer booking flow, API integration |
| Backend developer | Express APIs, JWT, password hashing, booking and payment rules |
| Database and admin developer | Schema, SQL queries, views, triggers, seed data, reports, admin workflow |

Each team member should understand the end-to-end flow for the DBMS viva and final demonstration.

## Security Notes

- Never commit `backend/.env` or `frontend/.env`; they are ignored by Git.
- Use a strong, unique `JWT_SECRET` outside local development.
- Do not use the seeded admin password in production.
- Use the Supabase pooled connection string for Vercel deployments; never expose it in frontend environment variables.
