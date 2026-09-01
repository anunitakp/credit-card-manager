-- ===========================================================================
-- Migration 04 — Assigning expenses to a trip
--
-- Run this AFTER migration-03. Safe to re-run.
--
-- Lets a Trip-category expense be filed against a particular trip, with its
-- own trip-level category (Stay, Food, Activities…) that is separate from the
-- expense's normal category.
--
-- This is a link table rather than columns on the expense, because an expense
-- lives in one of two tables — `expenses` (credit card) or `upi_expenses` —
-- and a single link keyed by transaction id covers both without touching
-- either. Assigning an expense never copies or moves it: the expense stays
-- exactly where it was, and the trip simply points at it.
-- ===========================================================================

create extension if not exists pgcrypto;

create table if not exists trip_expense_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  trip_id uuid not null references trips (id) on delete cascade,

  -- The id of a row in `all_transactions`. No foreign key is possible: the
  -- view unions two tables, so there is no single table to point at. The API
  -- checks the transaction belongs to the same account before linking, and
  -- reads drop links whose transaction has since been deleted.
  transaction_id uuid not null,

  trip_category text not null check (
    trip_category in (
      'Travel', 'Stay', 'Transport', 'Food', 'Dress',
      'Accessories & Toiletries', 'Souvenirs', 'Activities', 'Others'
    )
  ),
  created_at timestamptz not null default now()
);

-- An expense belongs to at most one trip. Re-assigning it to another trip
-- updates this row rather than creating a second one.
create unique index if not exists trip_expense_links_transaction_key
  on trip_expense_links (user_id, transaction_id);

create index if not exists trip_expense_links_trip_idx
  on trip_expense_links (trip_id);

-- --------------------------------------------------------------------------
-- Row Level Security — same posture as every other table. The app reaches
-- Supabase only from server-side routes with the service_role key, which
-- bypasses RLS; enabling it with no policies keeps the anon key out.
-- --------------------------------------------------------------------------
alter table trip_expense_links enable row level security;
