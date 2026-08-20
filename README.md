# Prakash Tour & Travels — Website + Admin Panel

Sasaram, Bihar. A static, framework-free website (customer site + owner admin
panel + booking/payment/invoice flow) structured as a **Vercel-deployable
repo** with zero build step.

## Structure

```
/
├── index.html            Customer homepage (hero, destinations, fleet, tours, etc.)
├── payment.html           Customer payment page — dynamic UPI QR + receipt upload
├── invoice.html            Customer/admin invoice view — print / save as PDF
├── admin.html               Owner Control Panel (login, dashboard, bookings, CRUD, settings)
├── css/
│   └── styles.css            Single shared theme — navy / gold / cream design system
├── js/
│   ├── icons.js                Inline SVG icon set (no external icon library)
│   ├── data.js                  Seed data + localStorage "database" + ID generators
│   ├── mailer-client.js          Calls /api/send-email + logs results into DB.emailLogs
│   ├── site.js                    Customer homepage rendering + booking modal
│   ├── payment.js                  QR generation, online-pay stub, receipt upload
│   ├── invoice.js                   Invoice rendering + print
│   └── admin.js                      Admin auth, dashboard, bookings, CRUD managers
├── api/                    Vercel serverless functions
│   ├── send-email.js               REAL Resend email sending (not a placeholder)
│   ├── _lib/
│   │   ├── resend.js                  Resend SDK wrapper (the only file touching RESEND_API_KEY)
│   │   └── emailTemplates.js           11 branded HTML email templates
│   ├── create-order.js             Payment gateway placeholders — see README below
│   ├── verify-payment.js
│   ├── webhook.js
│   ├── upload-receipt.js
│   └── generate-invoice.js
├── vercel.json
├── package.json
├── .env.example              Every environment variable a production build would need
├── .gitignore
├── DEPLOYMENT.md              Step-by-step Vercel deploy + how to add env vars
└── README.md
```

No React, no JSX, no bundler. Every `.html` file works if you just open it in
a browser — the `/api` functions only run once deployed to Vercel (or via
`vercel dev` locally).

## Deploying to Vercel

See **`DEPLOYMENT.md`** for the full step-by-step walkthrough, including
exactly how to add environment variables in the Vercel dashboard and CLI.
Short version:

1. Push this folder to a GitHub/GitLab/Bitbucket repo (or drag-and-drop the
   folder into the Vercel dashboard).
2. In Vercel: **New Project → Import** this repo.
3. Framework preset: **Other** (no build command, no output directory needed
   — it's already static).
4. Deploy. Vercel will automatically pick up the `/api/*.js` files as
   serverless functions.

For local testing with the API routes working: `npm run dev` (requires the
Vercel CLI, installed on demand via `npx`).

## Environment variables

The site runs with **zero environment variables** by default — everything
lives in `localStorage` and the `/api` functions are self-contained
placeholders. `.env.example` lists every variable a real production
integration (payment gateway, database, file storage, admin auth, WhatsApp
API, email) would need, with comments on where each one is used. Copy it to
`.env.local` for local work; add the same keys in the Vercel dashboard for
deployment — see `DEPLOYMENT.md`.

## Business details already wired in

- Business name: **Prakash Tour & Travels**
- Location: **Sasaram, Bihar** (near Sasaram Railway Station)
- Phone / WhatsApp: **8409150824** — used in the header, footer, mobile bar,
  booking modal, WhatsApp deep-links and the invoice.

Change any of these later from **Admin → Settings** (updates propagate to the
whole site since everything reads from one settings object) or by editing the
defaults in `js/data.js`.

## Demo login

```
URL:      /admin.html
Username: admin
Password: ChangeMe123!
```

This is a **client-side-only** login for demo convenience. Anyone who reads
the JavaScript can see the credentials and bypass it. **Do not use this for a
real production admin panel** — see "What you must change before going live"
below.

## Data storage (demo)

Everything (bookings, vehicles, destinations, tour packages, services,
reviews, FAQs, payments, receipts, invoices, settings) is stored in the
browser's `localStorage` under the key `ptt_db_v1`. This means:

- It works immediately with **no backend or database**, seeded with demo
  content on first load.
- Data is **per-browser, per-device** — a booking made on a customer's phone
  will not appear in the admin panel unless it's the same browser profile.
- Clearing browser storage clears all data.

This is intentional for a zero-backend static demo, but is **not sufitable
for a real multi-user business**. See below for what a production version
needs.

## Email notifications (real Resend integration)

Every important booking event sends a real branded email via
[Resend](https://resend.com) — this is not a mock:

| Event | Triggered from | Template function |
|---|---|---|
| Booking received | Customer submits the quote/booking form | `booking_received` |
| Booking approved / payment required | Admin sends the payment link | `booking_approved_payment_required` |
| Payment submitted | Customer uploads a receipt | `payment_submitted` |
| Payment approved | Admin approves a receipt / marks paid | `payment_approved` |
| Payment rejected | Admin rejects a receipt (reason required) | `payment_rejected` |
| Invoice ready | Admin generates the invoice | `invoice_ready` |
| Booking confirmed | Admin confirms the booking | `booking_confirmed` |
| Booking cancelled | Admin cancels a booking | `booking_cancelled` |
| Booking rejected | (template ready — wire in if you add pre-payment rejection) | `booking_rejected` |
| Vehicle & driver assigned | (template ready — wire in once vehicle/driver allocation is added) | `vehicle_driver_assigned` |
| Final payment required | (template ready — wire in once the advance/final two-stage flow is added) | `final_payment_required` |

**How it works:** the browser never talks to Resend directly. Every page
(`site.js`, `payment.js`, `admin.js`) calls `sendTransactionalEmail(type, booking, extra)`
from `js/mailer-client.js`, which POSTs to `/api/send-email` — a real
serverless function (`api/send-email.js`) that builds the branded HTML
(`api/_lib/emailTemplates.js`) and sends it via the official Resend SDK
(`api/_lib/resend.js`). `RESEND_API_KEY` never reaches the browser. Every
attempt — success or failure — is logged into `DB.emailLogs` and shown on
each booking's **Email History** panel in the admin panel, with a one-click
**Resend** button.

**Setting up Resend (takes about 5 minutes):**
1. Create a free account at https://resend.com
2. **API Keys** → Create API Key → copy it → set it as `RESEND_API_KEY` in
   Vercel (see "Environment variables" below).
3. For real customer email, verify your own sending domain: **Domains** →
   Add Domain → add the DNS records Resend gives you at your domain
   registrar → wait for verification. Until then, you can test with
   `EMAIL_FROM="Prakash Tour & Travels <onboarding@resend.dev>"`, but Resend
   only allows sending test emails to your own account's email address from
   that shared domain — set your real verified domain before launch.
4. Set `EMAIL_FROM` to an address on your verified domain, e.g.
   `EMAIL_FROM="Prakash Tour & Travels <bookings@prakashtourtravels.in>"`.
5. Set `APP_URL` to your real deployed URL (e.g.
   `https://prakashtourtravels.vercel.app`) — used to build the links inside
   emails (payment page, invoice, booking status).

**Local testing without deploying:** `vercel dev` reads `.env.local`, so
`cp .env.example .env.local`, fill in a real `RESEND_API_KEY`, and the
"Send Payment Link Email" / booking-creation emails will actually send.

## Payment flow (as implemented)

Two flows are implemented end-to-end in the UI, matching the required status
list (`PAYMENT_REQUIRED`, `RECEIPT_UPLOADED`, `PENDING_ADMIN_VERIFICATION`,
`APPROVED`, `REJECTED`, `PAID`, `PAYMENT_FAILED`, `INVOICE_GENERATED`,
`BOOKING_CONFIRMED`):

**Manual (working end-to-end in the browser):**
`PAYMENT_REQUIRED → customer uploads receipt on payment.html → PENDING_ADMIN_VERIFICATION → admin Approves/Rejects on admin.html → PAID / PAYMENT_FAILED → admin Generates Invoice → INVOICE_GENERATED → admin Confirms → BOOKING_CONFIRMED`

**"Automatic" (UI + placeholder API calls only):**
`payment.html` also has a **Pay Online (Auto-Verify)** button that calls
`/api/create-order` then `/api/verify-payment`. Those two files are clearly
commented placeholders that return mock data — they do **not** talk to a real
payment gateway. This satisfies the requirement that a static HTML/JS site
cannot itself be a secure payment backend, while still showing the complete
intended UI/UX.

The **QR code is real and dynamically generated** (via the `qrcodejs`
library from cdnjs) from a standard UPI deep link built from the business's
UPI ID, the booking's amount, and the booking reference — so it will
actually open a UPI app and prefill the amount when scanned. What it does
**not** do is verify that the payment was received; that still requires the
manual receipt-approval flow or a real gateway integration.

## What you must change before going live

1. **Replace the demo admin login** with real server-side authentication
   (e.g. NextAuth, Clerk, Supabase Auth, or your own session-based auth on a
   real backend). Never ship real admin credentials in client-side JS.
2. **Replace `localStorage` with a real database** (Postgres, MySQL,
   Supabase, Firebase, etc.) and turn `js/data.js`'s `loadDB`/`saveDB` into
   real API calls.
3. **Wire `/api/create-order.js` and `/api/verify-payment.js` to a real
   payment gateway** (Razorpay, Cashfree, PhonePe Business, etc.), using
   environment variables for all secret keys — never hard-code them in this
   repo. Add real webhook signature verification in `/api/webhook.js`.
4. **Move receipt uploads to real object storage** (Vercel Blob, S3,
   Cloudinary) instead of base64 strings in `localStorage` — see the comment
   block in `/api/upload-receipt.js`.
5. Replace all placeholder photography (currently a mix of Wikimedia Commons
   images) with the business's own photographs.
6. Fill in the **Cancellation Policy** and **Terms** in Admin → Settings with
   the real business policy — the placeholder text is clearly marked as such.

## Design system

One shared stylesheet (`css/styles.css`) drives the customer site, the
booking modal, the payment/QR screen, the invoice, the login screen and the
entire admin panel — navy (`--navy-950/900`), warm gold (`--gold-400/500/600`),
cream/stone backgrounds, Manrope for display type, Inter for body type. The
admin panel intentionally reuses these same tokens (sidebar in navy, gold
accents, the same card/button/radius system) rather than a generic dashboard
template, so it reads as an extension of the public site.
