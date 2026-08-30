-- ===========================================================================
-- Migration 01 — Expense Tracker
--
-- Run this in your Supabase project's SQL editor, on top of schema.sql.
--
-- It is safe to re-run, and safe to run over a database where an earlier
-- draft of this file was already applied: it reconciles what is there rather
-- than assuming it is creating everything from scratch.
--
-- What it does:
--   1. Widens the category list (adds Books & Subscription, Trip).
--   2. Creates `upi_expenses` — manually entered UPI transactions.
--   3. Creates `budgets`, `trips`, `notes`.
--   4. Creates the `all_transactions` view — the single source of truth the
--      expense tracker reads from. Credit-card rows and UPI rows sit side by
--      side, each keeping its own original id, so a credit-card expense can
--      never be duplicated into the tracker.
-- ===========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 0. Drop the view first.
--
--    `create or replace view` cannot change a view's column list, and this
--    version drops the `subcategory` column an earlier draft had. Dropping it
--    up front also frees the columns below to be altered — a view holds a
--    hard dependency on every column it selects.
-- --------------------------------------------------------------------------
drop view if exists all_transactions;

-- --------------------------------------------------------------------------
-- 1. Widen the category list on the existing expenses table
-- --------------------------------------------------------------------------
alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Culture', 'Books & Subscription', 'Therapy', 'Gift',
    'Electronics', 'Trip', 'Miscellaneous'
  )
);

-- Subcategories were dropped from the design; remove the column if an
-- earlier draft added it.
alter table expenses drop column if exists subcategory;

-- --------------------------------------------------------------------------
-- 2. UPI expenses — entered by hand in the Expense Tracker
-- --------------------------------------------------------------------------
create table if not exists upi_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null,
  created_at timestamptz not null default now()
);

-- Reconcile a table left behind by an earlier draft: add anything missing,
-- drop what is no longer wanted. Each statement is a no-op when the column is
-- already in the state it should be.
alter table upi_expenses drop column if exists subcategory;
alter table upi_expenses drop column if exists updated_at;
alter table upi_expenses add column if not exists created_at timestamptz not null default now();

alter table upi_expenses drop constraint if exists upi_expenses_category_check;
alter table upi_expenses add constraint upi_expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Culture', 'Books & Subscription', 'Therapy', 'Gift',
    'Electronics', 'Trip', 'Miscellaneous'
  )
);

create index if not exists upi_expenses_expense_date_idx on upi_expenses (expense_date);

-- --------------------------------------------------------------------------
-- 3a. Budgets — ONE standing budget, not one per month.
--
--     A budget is set once and applies to every month until it is changed.
--     `category` is null for the overall monthly budget, or a category name
--     for a per-category budget, so there is at most one row per category
--     plus one overall row.
-- --------------------------------------------------------------------------

-- An earlier draft made budgets month-specific. If that version was run, the
-- old table is replaced here — budgets are a handful of numbers, quick to
-- re-enter, and keeping a stale `month` column would silently split budgets
-- across months again.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'budgets' and column_name = 'month'
  ) then
    drop table budgets;
  end if;
end
$$;

create table if not exists budgets (
  id uuid primary key default gen_random_uuid(),
  category text,
  amount numeric(12, 2) not null check (amount >= 0)
);

alter table budgets drop column if exists created_at;
alter table budgets drop column if exists updated_at;

-- One overall budget, and one budget per category. Two partial unique indexes
-- are needed because NULL is never "equal" to NULL in a plain unique
-- constraint, which would let duplicate overall budgets slip in.
create unique index if not exists budgets_category_key
  on budgets (category) where category is not null;
create unique index if not exists budgets_overall_key
  on budgets ((category is null)) where category is null;

-- --------------------------------------------------------------------------
-- 3b. Trips
-- --------------------------------------------------------------------------
create table if not exists trips (
  id uuid primary key default gen_random_uuid(),
  trip_date date not null,
  place text not null,
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  notes text,
  created_at timestamptz not null default now()
);

alter table trips drop column if exists updated_at;
alter table trips add column if not exists created_at timestamptz not null default now();

create index if not exists trips_trip_date_idx on trips (trip_date desc);

-- --------------------------------------------------------------------------
-- 3c. Notes
--
--     `created_at` exists only to give the list a stable newest-first order;
--     the app never displays a timestamp.
-- --------------------------------------------------------------------------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  content text not null default '',
  created_at timestamptz not null default now()
);

alter table notes drop column if exists updated_at;
alter table notes add column if not exists created_at timestamptz not null default now();

create index if not exists notes_created_at_idx on notes (created_at desc);

-- --------------------------------------------------------------------------
-- 4. The single source of truth for the expense tracker.
--
--    Credit-card expenses contribute `my_spending` (total minus whatever
--    someone else is paying back), because that is what actually left your
--    pocket. Each row keeps its own table's primary key, so syncing is not a
--    thing that can go wrong — there is nothing to sync.
-- --------------------------------------------------------------------------
create view all_transactions as
  select
    e.id,
    'Credit Card'::text            as account,
    e.expense_name                 as description,
    e.category,
    e.my_spending                  as amount,
    e.expense_date,
    e.created_at,
    e.cycle_id
  from expenses e
  union all
  select
    u.id,
    'UPI'::text                    as account,
    u.description,
    u.category,
    u.amount,
    u.expense_date,
    u.created_at,
    null::uuid                     as cycle_id
  from upi_expenses u;

-- --------------------------------------------------------------------------
-- 5. Row Level Security — same posture as the existing tables. The app only
--    ever talks to Supabase from server-side API routes using the
--    service_role key, which bypasses RLS. Enabling RLS with no policies
--    keeps the anon/public key locked out entirely.
-- --------------------------------------------------------------------------
alter table upi_expenses enable row level security;
alter table budgets      enable row level security;
alter table trips        enable row level security;
alter table notes        enable row level security;

-- Views run with their OWNER's privileges by default, which would let the
-- anon key read straight through `all_transactions` into tables that RLS is
-- supposed to be protecting. security_invoker makes the view run as whoever
-- queries it, so RLS applies again. It needs Postgres 15+; on anything older
-- the setting simply does not exist, and the whole migration would roll back
-- over it, so it is applied defensively.
do $$
begin
  execute 'alter view all_transactions set (security_invoker = true)';
exception
  when others then
    raise notice 'Could not set security_invoker on all_transactions (%). The app is unaffected: it only ever reads this view with the service_role key.', sqlerrm;
end
$$;
