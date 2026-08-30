-- ===========================================================================
-- Migration 02 — Multi-user accounts
--
-- Run this AFTER migration-01. Safe to re-run.
--
-- Turns the app from single-user into per-account: every row now belongs to a
-- user, and the app only ever reads rows belonging to whoever is signed in.
--
-- Existing rows are left with a NULL user_id on purpose. The FIRST account
-- created through the sign-up page adopts all of them, so the data already in
-- here becomes that account's data without any manual SQL.
-- ===========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 1. Accounts
--
--    Passwords are stored only as scrypt hashes, in `salt:hash` form. The
--    app never writes a plaintext password anywhere.
-- --------------------------------------------------------------------------
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null,
  password_hash text not null,
  created_at timestamptz not null default now()
);

-- Usernames are compared case-insensitively, so "Anu" and "anu" cannot both
-- exist. The index is on lower(username) rather than the raw column so the
-- database enforces that rather than trusting the app to.
create unique index if not exists users_username_key on users (lower(username));

-- --------------------------------------------------------------------------
-- 2. Ownership
--
--    `expenses` deliberately has no user_id: it belongs to a billing cycle,
--    and the cycle carries the owner. Keeping ownership in one place per row
--    means the two can never disagree about who a credit-card expense
--    belongs to.
-- --------------------------------------------------------------------------
alter table billing_cycles add column if not exists user_id uuid references users (id) on delete cascade;
alter table upi_expenses   add column if not exists user_id uuid references users (id) on delete cascade;
alter table budgets        add column if not exists user_id uuid references users (id) on delete cascade;
alter table trips          add column if not exists user_id uuid references users (id) on delete cascade;
alter table notes          add column if not exists user_id uuid references users (id) on delete cascade;

create index if not exists billing_cycles_user_id_idx on billing_cycles (user_id);
create index if not exists upi_expenses_user_id_idx   on upi_expenses (user_id);
create index if not exists budgets_user_id_idx        on budgets (user_id);
create index if not exists trips_user_id_idx          on trips (user_id);
create index if not exists notes_user_id_idx          on notes (user_id);

-- --------------------------------------------------------------------------
-- 3. Uniqueness becomes per-account
--
--    Two people must both be able to have an August cycle, and both be able
--    to set a Food budget. These constraints were global before.
-- --------------------------------------------------------------------------
drop index if exists billing_cycles_start_date_key;
create unique index if not exists billing_cycles_user_start_date_key
  on billing_cycles (user_id, start_date);

drop index if exists budgets_category_key;
drop index if exists budgets_overall_key;
create unique index if not exists budgets_user_category_key
  on budgets (user_id, category) where category is not null;
create unique index if not exists budgets_user_overall_key
  on budgets (user_id) where category is null;

-- --------------------------------------------------------------------------
-- 4. The unified view carries the owner.
--
--    Credit-card rows pick theirs up from the cycle they belong to; UPI rows
--    carry their own. The app filters every read by it.
-- --------------------------------------------------------------------------
drop view if exists all_transactions;

create view all_transactions as
  select
    e.id,
    'Credit Card'::text            as account,
    e.expense_name                 as description,
    e.category,
    e.my_spending                  as amount,
    e.expense_date,
    e.created_at,
    e.cycle_id,
    c.user_id
  from expenses e
  join billing_cycles c on c.id = e.cycle_id
  union all
  select
    u.id,
    'UPI'::text                    as account,
    u.description,
    u.category,
    u.amount,
    u.expense_date,
    u.created_at,
    null::uuid                     as cycle_id,
    u.user_id
  from upi_expenses u;

-- --------------------------------------------------------------------------
-- 5. Row Level Security — unchanged posture. The app talks to Supabase only
--    from server-side routes with the service_role key, which bypasses RLS;
--    enabling it with no policies keeps the anon key locked out entirely.
--    Per-user isolation is enforced by the queries, not by RLS.
-- --------------------------------------------------------------------------
alter table users enable row level security;

do $$
begin
  execute 'alter view all_transactions set (security_invoker = true)';
exception
  when others then
    raise notice 'Could not set security_invoker on all_transactions (%).', sqlerrm;
end
$$;
