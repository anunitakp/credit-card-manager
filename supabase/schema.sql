-- Credit Card Expense Tracker — Supabase schema
-- Run this once in your Supabase project's SQL editor (Project → SQL Editor → New query).

create extension if not exists pgcrypto;

create table if not exists billing_cycles (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  closed_at timestamptz
);

create unique index if not exists billing_cycles_start_date_key on billing_cycles (start_date);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references billing_cycles (id) on delete cascade,
  expense_name text not null,
  category text not null check (
    category in (
      'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Transport',
      'Culture', 'Therapy', 'Gift', 'Miscellaneous', 'Electronics'
    )
  ),
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  others_amount numeric(12, 2) not null default 0 check (others_amount >= 0),
  my_spending numeric(12, 2) generated always as (total_amount - others_amount) stored,
  settlement_status text not null default 'not_settled' check (settlement_status in ('not_settled', 'settled')),
  expense_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint others_amount_le_total check (others_amount <= total_amount)
);

create index if not exists expenses_cycle_id_idx on expenses (cycle_id);
create index if not exists expenses_expense_date_idx on expenses (expense_date);

-- Row Level Security: this app has no end-user login and talks to Supabase
-- only from server-side API routes using the service_role key, which always
-- bypasses RLS. Enabling RLS with no policies blocks the anon/public key
-- entirely, so the tables stay inaccessible even if that key ever leaks.
alter table billing_cycles enable row level security;
alter table expenses enable row level security;
