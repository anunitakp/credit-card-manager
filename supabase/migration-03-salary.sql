-- ===========================================================================
-- Migration 03 — Salary, allocations and bonuses
--
-- Run this AFTER migration-02. Safe to re-run.
--
-- Three tables, because the three things behave differently:
--
--   salary_months       one figure per month — what came in
--   salary_allocations  where that money went, as many lines as you like
--   bonuses             occasional, dated, and deliberately kept apart from
--                       salary so a once-a-year windfall never distorts the
--                       monthly picture
-- ===========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 1. Monthly salary. `month` is the first day of the month, e.g. 2026-09-01.
-- --------------------------------------------------------------------------
create table if not exists salary_months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  month date not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

-- One salary figure per month per account.
create unique index if not exists salary_months_user_month_key
  on salary_months (user_id, month);

-- --------------------------------------------------------------------------
-- 2. What that month's money was used for.
--
--    Keyed by month rather than by salary row id: the split is worth keeping
--    even if the salary figure itself is edited or has not been entered yet.
--    Labels are free text — "Rent", "SIP", "Sent home" — because what people
--    do with a salary does not fit the expense categories.
-- --------------------------------------------------------------------------
create table if not exists salary_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  month date not null,
  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists salary_allocations_user_month_idx
  on salary_allocations (user_id, month);

-- --------------------------------------------------------------------------
-- 3. Bonuses.
--
--    Dated rather than monthly, and stored separately from salary on purpose:
--    a bonus is an exception, not part of the regular monthly income, and
--    folding it into `salary_months` would make one month look like a
--    permanent raise.
-- --------------------------------------------------------------------------
create table if not exists bonuses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  received_on date not null,
  label text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists bonuses_user_received_idx
  on bonuses (user_id, received_on desc);

-- --------------------------------------------------------------------------
-- 4. Row Level Security — same posture as every other table. The app reaches
--    Supabase only from server-side routes with the service_role key, which
--    bypasses RLS; enabling it with no policies keeps the anon key out.
--    Per-account isolation is enforced by the queries.
-- --------------------------------------------------------------------------
alter table salary_months      enable row level security;
alter table salary_allocations enable row level security;
alter table bonuses            enable row level security;
