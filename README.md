# Expense Tracker

A personal expense tracker with a glassmorphism interface, built around one
rule: **there is exactly one row per transaction, and both halves of the app
read it.**

Credit-card spending is entered in the Credit Card Manager, which tracks a
16th → 15th billing cycle. UPI spending is entered in the tracker. Neither is
ever copied into the other — the tracker reads a database view that unions the
two, so a card expense appears in the dashboard, budgets and statistics the
moment it is saved, and editing or deleting it there updates or removes it
everywhere. Nothing to sync, nothing to double-enter, no way to duplicate.

## Stack

- **Next.js 14** (App Router, TypeScript) — frontend and API routes in one app
- **Supabase (Postgres)** — persistent cloud database, free tier
- **Tailwind CSS** — the glass design system lives in `app/globals.css`
- **Recharts** — donut and bar charts
- **Vercel** — hosting, one HTTPS URL for every device

There is no login. The app is meant to be used by one person.

---

## Setup

### 1. Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query** and run, in this order:
   - [`supabase/schema.sql`](supabase/schema.sql) — billing cycles and
     credit-card expenses. Skip if your project already has these.
   - [`supabase/migration-01-expense-tracker.sql`](supabase/migration-01-expense-tracker.sql)
     — the tracker's tables and the `all_transactions` view. **Required.**
     Without it the app starts but every page reports a missing table.
3. Open **Project Settings → API** and copy the **Project URL** and the
   **`service_role` secret key** (not the `anon` key).

### 2. Run locally

```bash
npm install
```

Create `.env.local`:

```
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### 3. Deploy

Push to GitHub, import the repo at [vercel.com](https://vercel.com), add the
same two environment variables, and deploy. Every later push redeploys.

---

## How the data fits together

```
        Credit Card Manager                 Expense Tracker
        (16th → 15th cycles)                (UPI entries)
                 │                                 │
                 ▼                                 ▼
          expenses table                    upi_expenses table
                 │                                 │
                 └──────────────┬──────────────────┘
                                ▼
                    all_transactions  (view)
                                │
        ┌───────────┬───────────┼───────────┬─────────────┐
        ▼           ▼           ▼           ▼             ▼
    Dashboard   Expenses     Budget    Statistics    Categories
```

`all_transactions` is a plain SQL `union all`. Each row keeps its own table's
primary key, so a credit-card expense is never copied, never re-imported and
never duplicated — there is only ever the one row, seen from two places.

**A credit-card expense contributes `my_spending`** (its total minus whatever
someone else is paying back), because that is what actually left your pocket.
The card manager still shows the full total and the settlement status.

Adding an expense with the account set to **Credit Card** writes into the card
manager's current open billing cycle rather than creating a tracker-side copy,
so it does not matter which screen you start from.

An expense is five fields and no more: description, amount, category, date and
account. There are no subcategories, and no created/updated timestamps are
shown anywhere.

### Budgets

There is **one standing budget**, not one per month. Set the overall monthly
figure and any per-category figures once on `/budget`, and they apply to every
month until you edit them. A consequence worth knowing: looking at a past
month measures it against today's budget, because only one budget exists.

Budgets stay out of the numbers on `/statistics` — everything there is derived
from expenses alone. Budget progress appears only on `/budget` and on the
dashboard's headline card.

### Tables

| Table | Holds |
| --- | --- |
| `billing_cycles` | One row per 16th → 15th credit-card cycle, `open` or `closed`. |
| `expenses` | Credit-card expenses, belonging to a cycle. `my_spending` is a generated column. |
| `upi_expenses` | UPI expenses, entered in the tracker. |
| `budgets` | One standing budget per category, applied to every month; `category is null` is the overall monthly budget. |
| `trips` | Standalone travel records. Not counted in monthly spending. |
| `notes` | Free-form notes. |
| `all_transactions` | View: `expenses` ∪ `upi_expenses`, the tracker's only read source. |

---

## Pages

| Route | What it does |
| --- | --- |
| `/` | Dashboard — current month only: total, budget progress, category donut, ranked categories, recent transactions. |
| `/expenses` | Full history. Search, filter by month/category/account/amount, sort, edit, delete. |
| `/budget` | The standing overall and per-category budgets. Over-budget categories go red. |
| `/statistics` | Monthly and Yearly tabs, derived from expenses alone, with drill-down from any month or category into the underlying transactions. |
| `/trips` | Trip records — date, place, cost, notes. |
| `/notes` | Notes. |
| `/salary` | Placeholder; the route and layout exist so income tracking can be added later without restructuring. |
| `/cards` | The Credit Card Manager: current cycle, settlement tracking, close-the-month. |
| `/cards/archives` | Closed cycles, read-only. |

## How the billing cycle works

- The statement closes on the **15th**, so each cycle covers the **16th of one
  month through the 15th of the next**. See [`lib/billing-cycle.ts`](lib/billing-cycle.ts).
- **Close Current Month** archives the cycle and opens the next one. Archived
  cycles are immutable — the API rejects any change to them, not just the UI.
- The expense tracker slices the same rows by **calendar month** instead. Both
  views are correct; they are just different cuts of one dataset.

## Project structure

```
app/
  page.tsx                    Dashboard
  expenses/ budget/ statistics/ trips/ notes/ salary/
  cards/                      Credit Card Manager
  api/
    transactions/             The unified read
    upi-expenses/  budgets/  trips/  notes/
    cycles/  expenses/        Credit Card Manager endpoints
components/
  glass/                      GlassCard, GlassButton, GlassInput, GlassModal,
                              GlassSelect, GlassDropdown, SegmentedControl,
                              ProgressBar, MonthPicker, Popover
  tracker/                    AppShell, Sidebar, BottomNav, TrackerProvider,
                              AddExpenseProvider, charts, rows, cards
lib/
  analytics.ts                Every derived number, from one transaction array
  month.ts  format.ts         Calendar-month helpers, ₹ Indian formatting
  tracker-service.ts          Server-side queries
  billing-cycle.ts            16th → 15th date logic
supabase/
  schema.sql                  Base schema
  migration-01-expense-tracker.sql
```

## Design system

Icy-blue glassmorphism, defined once in `app/globals.css`:

- A fixed **atmosphere layer** (gradient plus three blurred colour blobs) sits
  behind everything. Every glass surface frosts *that*, which is what makes
  the blur read as depth rather than as flat transparency.
- Three glass weights — `.glass-subtle`, `.glass`, `.glass-strong` — so cards
  holding important numbers are more opaque and stay readable.
- Blue is an **accent**, not the interface: neutral milky glass on a pale
  glacier wash, with deep icy blue reserved for actions and positive states,
  and money in charcoal (light) or near-white (dark).
- Light and dark are separate palettes, toggled by the control at the bottom
  of the sidebar or in the mobile **More** sheet.
- Amounts use Indian digit grouping throughout — ₹1,25,000, never ₹125,000.
