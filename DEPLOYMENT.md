# Deploying Prakash Tour & Travels to Vercel

This is a static site (`index.html`, `admin.html`, `payment.html`,
`invoice.html`) plus a handful of `/api` serverless functions — no build
step, no framework. Vercel supports this directly.

---

## 1. Get the code into a Git repo

Vercel deploys from Git (GitHub, GitLab, or Bitbucket). If you haven't
already:

```bash
cd prakash-tour-travels
git init
git add .
git commit -m "Initial site"
```

Then create an empty repo on GitHub and push:

```bash
git remote add origin https://github.com/<your-username>/prakash-tour-travels.git
git branch -M main
git push -u origin main
```

(You can also skip Git entirely and drag-and-drop the folder into the
Vercel dashboard — see step 2, option B — but connecting Git means every
future push auto-deploys.)

---

## 2. Import the project into Vercel

**Option A — from GitHub (recommended):**
1. Go to https://vercel.com/new
2. Click **Import** next to your `prakash-tour-travels` repo (authorize
   Vercel's GitHub App if this is your first time).
3. On the configure screen:
   - **Framework Preset:** `Other`
   - **Build Command:** leave empty
   - **Output Directory:** leave empty (or `.`)
   - **Install Command:** leave empty
4. Click **Deploy**.

**Option B — drag and drop (no Git):**
1. Go to https://vercel.com/new
2. Choose **Deploy without Git** / drag your project folder onto the page.
3. Same settings as above (Framework: Other, no build command).

Either way, Vercel automatically detects the files in `/api/*.js` and
deploys each as its own serverless function at `/api/create-order`,
`/api/verify-payment`, etc. — no extra configuration needed for that part.

You'll get a live URL like `https://prakash-tour-travels.vercel.app`.

---

## 3. How to create environment variables in Vercel

The site works out of the box with **no environment variables set** — the
`/api` functions are placeholders and the rest of the app runs on
`localStorage`. You only need env vars once you wire up real integrations
(payment gateway, database, file storage, etc.), listed in `.env.example`.

**Via the Vercel dashboard:**
1. Open your project on https://vercel.com/dashboard
2. Go to **Settings → Environment Variables**
3. For each variable (e.g. `RAZORPAY_KEY_ID`):
   - **Key:** `RAZORPAY_KEY_ID`
   - **Value:** paste the real value from your provider's dashboard
   - **Environments:** tick `Production`, `Preview`, and/or `Development`
     depending on where it should apply (for secrets, it's common to set
     different test-mode keys for Preview/Development and live keys only
     for Production)
4. Click **Save**.
5. Repeat for each variable you need from `.env.example`.
6. **Redeploy** — environment variable changes only take effect on the
   *next* deployment. Go to **Deployments**, open the latest one, and click
   **Redeploy** (or just push a new commit).

**Via the Vercel CLI** (equivalent, useful for scripting):
```bash
npm i -g vercel        # one-time
vercel login
vercel link             # run inside the project folder, links it to your Vercel project
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
# ...repeat for each variable, choosing production / preview / development
vercel --prod            # redeploy with the new variables
```

**For local development**, copy the example file and fill in test values —
this file stays on your machine only (it's in `.gitignore`):
```bash
cp .env.example .env.local
# edit .env.local with real or test values
vercel dev               # runs the site + /api functions locally with .env.local loaded
```

---

## 4. Custom domain (optional)

1. In your Vercel project: **Settings → Domains**
2. Add your domain (e.g. `prakashtourtravels.in`)
3. Vercel shows you the DNS records to add at your domain registrar (usually
   an `A` record or `CNAME`). Add them there.
4. Wait for DNS to propagate (usually minutes, sometimes longer) — Vercel
   auto-provisions an SSL certificate once it verifies.

---

## 5. After deploying — quick checklist

- [ ] Visit `/index.html` (or just `/`) and confirm the homepage loads with
      images, and the booking modal opens and submits.
- [ ] Visit `/admin.html`, log in with the demo credentials, and confirm a
      booking made on the homepage shows up in **Bookings** (this only
      reliably works once it's on a real https:// domain — see the
      file:// caveats in `README.md`).
- [ ] If you've added `RAZORPAY_KEY_ID`/`RAZORPAY_KEY_SECRET`, they won't
      automatically go live — you still need to uncomment and wire in the
      real SDK calls marked `TODO (production)` inside `api/create-order.js`
      and `api/verify-payment.js`. Until then, those endpoints stay in demo
      mode (they'll just report `gatewayKeysConfigured: true` in their
      response so you can confirm the env vars are being read correctly).
- [ ] Change the demo admin password before sharing the URL with anyone —
      see the Security Notice in `README.md` for what a real login needs.

---

## Redeploying after changes

Any push to your connected Git branch triggers a new deployment
automatically. Environment variable changes need an explicit redeploy (step
3 above) since they're baked in at build/deploy time for serverless
functions.
