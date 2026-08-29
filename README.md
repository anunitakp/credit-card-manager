# Credit Card Expense Tracker

A personal credit-card expense tracker built around a 16th → 15th billing
cycle, with cloud-synced data (Supabase/Postgres) so it stays in sync across
your laptop, phone, and tablet.

## Stack

- **Next.js 14** (App Router, TypeScript) — frontend + API routes in one app
- **Supabase (Postgres)** — persistent cloud database, free tier
- **Tailwind CSS** — responsive styling
- **Recharts** — category spending donut chart
- **Vercel** — hosting (free tier), gives you one HTTPS URL for every device

There is no login. The app is meant to be used by one person; if you ever
want to add a password gate later, that's a small addition — just ask.

---

## 1. Create your Supabase project (one-time, ~3 minutes)

Supabase is where your expense data actually lives — it's a hosted Postgres
database with a free tier that's more than enough for this app. **You'll
need to do this step yourself** (account creation isn't something I can do
on your behalf):

1. Go to [supabase.com](https://supabase.com) and sign up for a free account.
2. Click **New Project**. Pick any name/region/password (the DB password
   isn't something this app needs — Supabase manages that internally).
3. Once the project is ready, open **SQL Editor** in the left sidebar, click
   **New query**, paste in the contents of [`supabase/schema.sql`](supabase/schema.sql)
   from this repo, and click **Run**. This creates the `billing_cycles` and
   `expenses` tables.
4. Open **Project Settings → API**. You'll need two values from this page:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **`service_role` secret key** (⚠️ not the `anon`/`public` key — the
     `service_role` key, kept secret, used only on the server)

Keep this tab open — you'll paste both values in step 2 and again in step 3.

## 2. Run it locally (optional, to try it before deploying)

```bash
npm install
cp .env.local.example .env.local
```

Open `.env.local` and fill in the two values from step 1:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Then:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

## 3. Deploy to Vercel so it's reachable from every device

1. Push this project to a GitHub repository (ask me and I can do this for
   you once you've created the repo, or run it yourself):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to [vercel.com](https://vercel.com) and sign up for a free account
   (again, this needs to be you — I can't create accounts on your behalf).
3. Click **Add New → Project**, import the GitHub repo you just pushed.
4. In the **Environment Variables** step, add the same two values from
   step 1:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**. A few minutes later you'll have a public URL like
   `https://your-app.vercel.app` — open that on your phone, tablet, or any
   other device and you're looking at the same live data.

From then on, any change you push to the repo redeploys automatically.

---

## How the billing cycle works

- Your statement closes on the **15th** of every month, so each tracker
  covers **the 16th of one month through the 15th of the next**.
- The app always figures out the correct "current" cycle automatically —
  see [`lib/billing-cycle.ts`](lib/billing-cycle.ts).
- Clicking **Close Current Month**:
  1. Marks the current cycle `closed` (it moves to **Archives**, read-only,
     with all its expenses and settlement statuses preserved exactly as they
     were).
  2. Immediately creates the next cycle (the 16th right after the one that
     just closed), starting empty.
- Archived cycles are never modified — the API rejects any add/edit/delete/
  settlement-toggle request against a closed cycle, even if attempted
  directly (not just hidden in the UI).

## Data model

- `billing_cycles` — one row per 16th→15th cycle, `status` is `open` or
  `closed`.
- `expenses` — belongs to a cycle; `my_spending` is a **generated column**
  (`total_amount − others_amount`), computed by Postgres so it's always
  correct. `settlement_status` is `not_settled` / `settled`, only meaningful
  when `others_amount > 0`.

## Project structure

```
app/
  page.tsx                 Current-cycle dashboard
  archives/page.tsx         Archives list
  archives/[id]/page.tsx    Read-only archived cycle detail
  api/cycles/...            Cycle read/close endpoints
  api/expenses/...          Expense create/update/delete/settlement endpoints
components/                 UI: forms, table, charts, dialogs
lib/                        Billing-cycle math, Supabase client, validation
supabase/schema.sql          Database schema — run once in Supabase's SQL editor
```
