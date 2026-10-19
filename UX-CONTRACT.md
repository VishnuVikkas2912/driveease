# UX Contract

## Product context

English rental app for customers and administrators, INR/en-IN, Gregorian date-only rentals without timezone conversion. Accessibility target WCAG 2.2 AA. Visual system: DESIGN.md; canonical runtime variables: frontend/src/styles.css. Light theme, forced-colors and reduced-motion supported.

## Business-context sources

| Domain / scope          | Authoritative source                                | Source type                             | Reviewed date |
| ----------------------- | --------------------------------------------------- | --------------------------------------- | ------------- |
| Permission model        | backend/src/middleware/auth.js; README.md           | Server authorization / product brief    | 2026-10-19    |
| Data lifecycle          | database/schema.sql; backend/src/routes/bookings.js | Domain constraints                      | 2026-10-19    |
| Deletion / retention    | backend/src/routes/vehicles.js                      | Retirement API; no hard-delete UI       | 2026-10-19    |
| Billing / payment       | README.md; backend/src/routes/bookings.js           | Simulated payment contract              | 2026-10-19    |
| Legal / regulatory copy | README.md                                           | No additional legal promises introduced | 2026-10-19    |

## Canonical UI Map

| Capability     | Canonical owner                                    | Source of truth               | Allowed variants                     | Verification             |
| -------------- | -------------------------------------------------- | ----------------------------- | ------------------------------------ | ------------------------ |
| Select/Listbox | Field in frontend/src/components/ui.jsx            | UX contract                   | native; platform popup accepted      | keyboard + popup         |
| Date           | Field in frontend/src/components/ui.jsx            | UX contract                   | native; platform locale accepted     | browser + API validation |
| Form           | useForm + Field in frontend/src/components/ui.jsx  | UX contract                   | auth / booking / maintenance         | validation + integration |
| Scrollbar      | frontend/src/styles.css                            | DESIGN.md                     | global baseline                      | computed style           |
| Toast          | Feedback context in frontend/src/components/ui.jsx | UX contract                   | success / info                       | live region              |
| CRUD           | frontend/src/main.jsx; services/api.js             | server routes / this contract | reserve / cancel / approve / service | integration + browser    |

## Dataset navigation

Catalog: explicit Load more, 12 items per request; type/dates in URL. Bookings and maintenance: server pagination, 10 per page; page in URL. Dashboard utilization: server bounded to six rows. No table selection. Search uses explicit submission (no keystroke requests), clear resets dates/type and returns focus. No keyword search.

## Flow ledger

| Operation        | Pending               | Success                                 | Failure recovery                         | Source ref     |
| ---------------- | --------------------- | --------------------------------------- | ---------------------------------------- | -------------- |
| Reserve          | disable submit        | /bookings + status confirmation         | preserve dates and show inline API error | bookings POST  |
| Cancel/reject    | modal, disable action | refresh list + status                   | keep dialog open                         | bookings PATCH |
| Approve          | disable row actions   | refresh + status                        | inline error                             | bookings PATCH |
| Schedule service | disable submit        | reset form, refresh dashboard + records | preserve values                          | admin POST     |
| Auth             | disable submit        | return to intended vehicle or catalog   | preserve fields + error                  | auth POST      |

## Forms and resilience

noValidate, shared field validation and first-invalid focus. Explicit labels, aria-invalid and aria-describedby; masked passwords with reveal and autocomplete. Dates must be real ISO dates, later return, non-past pickup. Native select/calendar popups intentionally use operating-system ownership. Unsaved form navigation uses the shared navigation guard, with beforeunload only for page unload. No automatic retry for writes; manual retry after failure. GET requests cancel on unmount and have bounded timeout. Requests never overwrite newer route results. Session token uses sessionStorage (tab lifetime) and is revalidated with /auth/me on startup; 401 clears session and offers sign-in. Server retains final authorization.

## Dialogs and feedback

Shared native dialog element is opened with showModal: browser-owned focus trap/inert background, accessible title/description, cancel focused, Escape and restoration. Cancel booking, reject booking, complete maintenance and schedule maintenance require object-specific confirmation. Approval remains a reversible pending-state operation only as defined by existing API. Status lives in shared polite region, failures persist near the action. No real payment fields or charge.

## Navigation and layout

All public routes set document title. Protected routes redirect to login with safe return path; /admin enforces role and gives an app-owned forbidden state. Unknown routes give app-owned 404. Mobile header retains every navigation action, tables scroll horizontally with labels. Body scroll remains natural. Page titles receive focus on route change. No hidden overflow on shell.

## Verification

npm test: real isolated PostgreSQL schema + API integration; npm run build; npm run format:check; npm run test:design; strict premium audit. Browser: desktop and narrow screenshots, account validation, booking and cancellation, admin approval/maintenance, loading, failure/retry, no-results, keyboard and reduced-motion. Catalog/detail and bookings/admin are sibling comparisons. Evidence: backend/test/integration.test.js and verification.md.

## Vehicle photography

`database/fleet.json` owns curated model-to-photo mappings. Shared `VehiclePhoto` owns card/detail display and accessible failure fallback; `PhotoCredit` and `/photo-credits` expose source and license links. `/api/vehicles/summary` reports non-retired fleet totals independently of rental-date availability. Catalogue updates are additive and preserve existing IDs, prices, states and bookings. Verify with `npm run test:fleet`, integration tests and browser card/detail checks.

Registration licence rules are shared by the form and API in `shared/driving-license.js`. `LicenceNumberField` owns uppercase entry, blur validation and separator errors; shared Field owns accessible hint/error descriptions. Invalid submit focuses the field and preserves entries. API field errors map to the same fields. Only compact standard numbers and AP/TS/TG three-digit-office variants are supported. Date and embedded-year checks allow later renewal issue dates. UI copy must identify these as format/date checks, never government verification. Test with licence unit, field interaction and PostgreSQL integration tests.
