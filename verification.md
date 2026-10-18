# Verification — DriveEase redesign

Verified locally on 19 October 2026 (Asia/Kolkata). The repository was cloned into `app` and changes are on `codex/driveease-redesign`.

## Automated checks

- `npm test`: 15 PostgreSQL/API scenarios plus their parent suite (Node reports 16 passing tests); 8 frontend component tests pass.
- `npm run build`: production Vite build passes; frontend JS about 95 kB gzip, CSS about 7 kB gzip. Fonts are self-hosted.
- `npm run format:check`: passes.
- `npm run test:design`: 8 documented colors match runtime CSS.
- `npm audit`, `npm --prefix backend audit`, `npm --prefix frontend audit`: zero known vulnerabilities at verification time.
- `npx -p @google/design.md designmd lint DESIGN.md`: 0 errors; token-reference warnings reflect prose-documented component bindings.
- Premium strict audit: zero findings. Machine evidence: `premium-audit.json`.
- `git diff --check`: passes. No TypeScript compiler is configured; JSX and ES modules are checked by build/test tooling.

Database tests use a uniquely named disposable local schema loaded from the real SQL. No mocks stand in for PostgreSQL. They verify transaction rollback after a forced payment failure, one winner for simultaneous overlapping bookings, date boundaries, authorization, customer isolation, real dashboard SQL, stored history and maintenance triggers. Four additive read indexes support vehicle images/reviews, customer booking pagination and email lookup.

## Browser checks

Inspected the running app at desktop 1280×720 and phone 390×844 using the actual local Express API and PostgreSQL database:

- Landing page, fleet cards, login, detail, booking history, operations and maintenance use the same visual system.
- Empty login submit shows associated errors and focuses the first invalid field.
- Admin and customer login work; customer receives an app-owned access-restricted page for `/admin`.
- A customer reserved a Tata Nexon for 10–13 November 2026. The UI showed the correct ₹6,600 total and a pending booking after the simulated payment.
- Cancellation opens a named dialog with “Keep booking” focused. Escape restores the trigger. Confirming cancellation updates the row and live status.
- An administrator approved a separate Hyundai reservation; the status changed to Approved and rented-day reporting showed 3 days.
- Scheduling Ather maintenance reduced available rides from 4 to 3. Completing it through the shared confirmation dialog restored availability to 4.
- Unsaved maintenance navigation opens a “Leave this form?” dialog; the form is preserved until the user chooses to leave.
- No-results search has a working Clear filters action.
- Deliberately stopping the API produces a recoverable error. Restarting it and choosing Try again restores the fleet. Dashboard, maintenance and vehicle-option errors can recover independently.
- Native vehicle select supports keyboard opening/Escape and exposes all options. Date controls accept native input. Their popup geometry and locale intentionally belong to the OS/browser.
- At 390px, document scrollWidth equals viewport width (390px); tables scroll inside their own panels and long forms remain document-scrollable.
- Computed global scrollbar colors match the runtime tokens. All inspected forms use noValidate.

Reduced-motion and forced-colors rules are implemented. Browser preference switching, full 200% zoom, screen-reader testing and a multi-device browser matrix have not been completed. The axe test checks structural accessibility in jsdom with color-contrast disabled; it is not a WCAG certification.

Initial layout screenshots (before the model-photo correction): [Desktop](verification-assets/home-desktop.png) · [Phone](verification-assets/home-mobile.png).

## Deployment

Root deployment config packages the frontend and Express API behind one origin; separate-project configurations remain available. SPA deep-link rewrites, readiness endpoint, TLS configuration and environment examples are included. The user selected reuse of the existing Supabase database. Do not load development seed/test data there.

Live deployment is pending Vercel authentication and the existing Supabase connection settings. Local verification does not establish production database connectivity. No production data or original deployment was modified. Apply the optional additive index migration to the existing database only as part of the deployment plan.

## Remaining release constraints

- Confirm Vercel preview `/api/ready`, then exercise sign-in, booking and admin approval against the intended hosted database before promotion.
- Vehicle photos depict the actual named models; colour, trim and model year can differ from a specific rental unit. The Ather image is credited official manufacturer media; the other 11 photos retain their Creative Commons attribution and license links.
- Payments remain simulations. Original revenue accounting for successful payment records is preserved, including cancelled reservations.
- The auth limiter is per instance; use hosting-edge controls for distributed abuse protection.
- The local seed administrator is for development only; the hosted database must use its own secure administrator credentials.

## Fleet and authentic-image update

The catalogue expanded from 2 cars + 2 bikes to 6 cars + 6 bikes. All 12 models have distinct local WebP assets, approximately 3.5 MB combined, lazy-loaded on catalogue cards. Frames are larger and use contain so neither vehicles nor portrait photographs are cropped. A failed image produces a labelled neutral icon instead of an unrelated road/car.

`npm run test:fleet` checks canonical-to-generated data, asset presence, WebP headers, file-size bounds, attribution and unique image bytes. API integration reruns the migration and confirms IDs, prices, statuses and image counts remain stable. Browser checks confirm the selected date range is preserved, Bike filtering returns six models, and all six bike photographs load.

The update was applied only to local `driveease_local`. Existing bookings were retained. Hosted Supabase/deployment is still pending the earlier account configuration.

Updated photo evidence: [Fleet preview](verification-assets/fleet-authentic-preview.png) · [Phone preview](verification-assets/fleet-authentic-mobile.png). All 12 images returned valid WebP over HTTP and loaded in the browser; no horizontal document overflow was observed at the narrow breakpoint.
