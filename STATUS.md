# STATUS — Production Upgrade Progress

This documents exactly what has been converted from the original
localStorage/demo project to real, database-backed production
functionality, and what's still left before this can safely handle real
customers and money.

## ✅ Done — real, working code

**Database** (`prisma/schema.prisma`)
Full schema matching the spec: Booking, Customer, Vehicle, Driver, Payment,
PaymentRequest, AdditionalCharge, BookingTimeline, Invoice, EmailLog,
AuditLog, CustomerQuery, AdminUser, ReminderLog. Three independent status
enums (BookingStatus / PaymentStatusOverall / TripStatus) as required.
**Not yet run against a real database** — `npx prisma generate` /
`migrate` couldn't reach Prisma's engine-binary CDN from this build
sandbox's network policy. Run it yourself as the first setup step; the
schema syntax has been manually reviewed but not machine-validated.

**Server-side core** (`lib/`)
- `db.js` — Prisma client singleton
- `calc.js` — the ONLY place that computes advance/remaining/final/outstanding amounts
- `auth.js` — bcrypt + signed HTTP-only JWT admin sessions (no more `isAdmin=true`)
- `availability.js` — server-side vehicle/driver date-overlap conflict checks
- `timeline.js` / `audit.js` — persistent timeline + audit log writers
- `mailer.js` — sends via Resend and permanently logs every attempt (success or failure)
- `blob.js` — real Vercel Blob receipt uploads (JPG/PNG/WEBP/PDF, 8MB cap)
- `ids.js` — server-generated `TRV-2026-00001`, `PTT-INV-2026-00001`, and 256-bit secure payment tokens
- `dto.js` — customer-safe response shapes (never leaks internal IDs/admin data)

**APIs** (42 files under `api/`, all syntax-checked)
- Customer: create booking, secure booking-status lookup, live vehicle
  availability, secure payment-token page, receipt upload, raise a query,
  secure invoice lookup
- Admin: login/logout/session/bootstrap, bookings list/detail/approve/
  reject/assign-vehicle/assign-driver/trip-status/charges/finalize-charges,
  payment verify + manual reminder, vehicles CRUD, drivers CRUD, dashboard
  stats, generate-invoice, email history + resend, queries list/respond
- Payments: manual UPI + receipt (always available), Razorpay gateway
  (optional — only activates if `RAZORPAY_KEY_ID`/`SECRET` are set), signature
  verified server-side, never trusts a client "payment successful"
- `api/cron/reminders.js` — scheduled reminder job (wired into `vercel.json` crons)

**Frontend**, rewired to call the real APIs (`js/api.js` is the single
fetch layer):
- `site.js` — booking form now creates a real server-side booking; the
  vehicle dropdown fetches live availability instead of a hardcoded list
- `booking-status.js` — full rewrite against `POST /api/booking-status`,
  renders the real DTO (status, payment breakdown, vehicle/driver, real
  timeline events, invoice link, "raise a query" form)
- `payment.js` — full rewrite against the secure `/payment/:token` page:
  real QR, real receipt upload, optional Razorpay checkout
- `invoice.js` — full rewrite: secure bookingId+email gate, renders the
  real invoice DTO (never client-generates an invoice number anymore)
- `admin.js` — full rewrite: real login, real dashboard stats, real
  bookings list/detail with approve/reject/assign/charges/verify/
  generate-invoice, a genuine Fleet Vehicles admin (replacing the old
  marketing-only vehicle list), a new Drivers admin, and a Customer
  Queries admin

**Removed**: `js/mailer-client.js` and `api/send-email.js` (the old
client-driven, localStorage-logging email path) — replaced by
`lib/mailer.js`, which is server-only and writes to the real `EmailLog`
table.

## ⚠️ Known gaps / next steps

1. **Schema never run against a live Postgres.** First thing to do:
   `DATABASE_URL=... npx prisma migrate dev --name init`, then
   `npx prisma generate`. Watch for typos surfacing on first migrate.
2. **No live end-to-end test was possible in this sandbox** (no outbound
   DB, no Resend/Blob/Razorpay credentials, no deployed URL). Everything
   here is code-reviewed and syntax-checked, not integration-tested.
   Budget time to walk the full flow in Part 47 of the original spec
   once deployed to a Vercel preview.
3. **Bootstrap the first admin account** via
   `POST /api/admin/init` with header `Authorization: Bearer <ADMIN_SESSION_SECRET>`
   and body `{ "username": "...", "password": "..." }` (min 10 chars).
   There is no default admin — this is intentional.
2. **Destinations / Tour Packages / Services** remain static
   localStorage-backed marketing content, edited from Admin → Destinations
   /Tours/Services. This was a deliberate scope call — they aren't part of
   the spec's required database entities (Part 2), and keeping them simple
   avoids a large low-value CMS build. Business data (bookings, payments,
   vehicles-as-fleet, drivers, invoices, emails, audit logs) is fully on
   the database.
3. **Invoice "PDF"** is an HTML page (`invoice.html`) meant to be printed /
   saved as PDF from the browser (`window.print()`), not a server-rendered
   PDF file. This matches the original project's approach and avoids
   pulling in a heavy headless-browser PDF pipeline; swap in
   `/mnt/skills/public/pdf` (or a service like `@react-pdf/renderer`) if a
   true PDF file/API response is required.
4. **Payment receipt access control**: `lib/blob.js` uploads with
   `access: "public"`. Anyone with the exact random URL can view a
   receipt, but URLs aren't discoverable/listed anywhere public. For
   stricter control, switch to Vercel Blob's private access mode with
   short-lived signed URLs generated per admin request.
5. **Rate limiting** on `/api/booking-status` is in-memory per server
   instance — fine for a single Vercel function instance under light load,
   but won't coordinate across concurrently warm instances. Move to a
   shared store (Upstash Redis, Vercel KV) if abuse becomes a concern.
6. **CSS status colors**: new enum values got matching `.status-*` classes
   in `css/styles.css`; sanity-check them visually once deployed.
7. **Testing checklist (Part 47 of the original spec)** has not been
   executed — do this against a real deployment before launch.

## Setup order (recommended)

1. Create a Postgres DB (Neon/Supabase/Vercel Postgres) → set `DATABASE_URL`
2. `npm install` → `npx prisma migrate dev --name init` → `npx prisma generate`
3. Set `ADMIN_SESSION_SECRET` (`openssl rand -base64 32`)
4. Bootstrap the first admin via `POST /api/admin/init` (see above)
5. Set up Vercel Blob → `BLOB_READ_WRITE_TOKEN`
6. Set up Resend → `RESEND_API_KEY`, `EMAIL_FROM`
7. Set `APP_URL` to your real deployment URL
8. (Optional) Set `RAZORPAY_KEY_ID`/`SECRET` for instant online payment
9. (Optional) Set `CRON_SECRET` and confirm the Vercel Cron in `vercel.json`
10. Deploy, log into `/admin.html`, add real vehicles + drivers, then run
    through the Part 47 testing checklist end to end.
