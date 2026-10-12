# DriveEase

A full-stack DBMS project for vehicle rental, booking, payments and maintenance. It uses a React/Vite frontend, Express REST API and MySQL database.

## Run locally

1. In MySQL, execute `database/schema.sql`, then `database/seed.sql`.
2. Copy `backend/.env.example` to `backend/.env`, set the database credentials and a JWT secret.
3. Copy `frontend/.env.example` to `frontend/.env` if the API is not on the default address.
4. From the repository root run `npm run install:all`.
5. Start two terminals: `npm run dev:backend` and `npm run dev:frontend`.

Open `http://localhost:5173`. Development admin account: `admin@example.com` / `Admin@123`.

## What demonstrates DBMS use

- Nine normalized relational tables with primary keys, foreign keys, unique and check constraints.
- Parameterized queries and indexes for vehicle/date availability checks.
- A booking/payment transaction with rollback on a conflict or failure.
- `booking_details` and `vehicle_utilization` views, maintenance triggers, and a booking-history stored procedure.
- JOIN and aggregate-based dashboard reports.

## Team split

Frontend: React pages, components and API integration. Backend: Express routes, JWT, password hashing and booking transaction. Database/Admin: schema, seed data, views, triggers, procedures, maintenance and reports. Everyone should be able to explain the complete workflow.
