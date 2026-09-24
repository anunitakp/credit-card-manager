-- ===========================================================================
-- Migration 07 — Multiple credit cards
--
-- Run this AFTER migration-06. Safe to re-run.
--
-- Until now the app assumed exactly one credit card, with a bill date
-- hardcoded to the 15th. This introduces a `cards` table and hangs every
-- billing cycle off a card, so an account can hold several cards from
-- different banks with different bill dates side by side.
--
-- Nothing about the *expenses* changes: an expense still belongs to a cycle,
-- and the cycle still carries the owner. The card sits one level above the
-- cycle, so there is still exactly one place that says who a credit-card
-- expense belongs to and which card it was put on.
-- ===========================================================================

create extension if not exists pgcrypto;

-- --------------------------------------------------------------------------
-- 1. The cards themselves
--
--    `bill_day` is the day of the month the card's bill falls due. It is not
--    used to slice spending into windows — it only decides when the current
--    month may be closed. Days 29-31 are allowed and clamped to the length
--    of each month by the app, so a card billed on the 31st bills on the
--    last day of February.
-- --------------------------------------------------------------------------
create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  name text not null,
  bill_day int not null default 15 check (bill_day between 1 and 31),
  created_at timestamptz not null default now()
);

create index if not exists cards_user_id_idx on cards (user_id);

-- Two cards on one account cannot share a name, or the switcher would show
-- two identical chips. Compared case-insensitively, as usernames are.
create unique index if not exists cards_user_name_key on cards (user_id, lower(name));

-- --------------------------------------------------------------------------
-- 2. Cycles belong to a card
-- --------------------------------------------------------------------------
alter table billing_cycles add column if not exists card_id uuid references cards (id) on delete cascade;
create index if not exists billing_cycles_card_id_idx on billing_cycles (card_id);

-- --------------------------------------------------------------------------
-- 3. Adopt the existing cycles
--
--    Every account that already has billing cycles gets one card named
--    "HDFC Card" billed on the 15th — the card those cycles were always
--    implicitly on — and its cycles are pointed at it. Accounts with no
--    cycles get no card; the app creates one when they first open Cards.
-- --------------------------------------------------------------------------
insert into cards (user_id, name, bill_day)
select distinct c.user_id, 'HDFC Card', 15
from billing_cycles c
where c.user_id is not null
  and not exists (select 1 from cards k where k.user_id = c.user_id)
on conflict do nothing;

update billing_cycles c
set card_id = k.id
from cards k
where c.card_id is null
  and c.user_id = k.user_id
  and k.name = 'HDFC Card';

-- --------------------------------------------------------------------------
-- 4. Uniqueness becomes per-card
--
--    Two cards will routinely have months starting on the same day. The old
--    per-account constraint would have made the second card impossible.
-- --------------------------------------------------------------------------
drop index if exists billing_cycles_user_start_date_key;
create unique index if not exists billing_cycles_card_start_date_key
  on billing_cycles (card_id, start_date);

-- --------------------------------------------------------------------------
-- 5. The unified view carries the card
--
--    So the Expenses tab can name the card a row was put on without a second
--    query. UPI rows have no card, hence the nulls.
--
--    Dropped first rather than replaced: `create or replace view` cannot
--    change a view's column list.
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
    c.user_id,
    c.card_id,
    k.name                         as card_name
  from expenses e
  join billing_cycles c on c.id = e.cycle_id
  left join cards k on k.id = c.card_id
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
    u.user_id,
    null::uuid                     as card_id,
    null::text                     as card_name
  from upi_expenses u;

-- --------------------------------------------------------------------------
-- 6. Row Level Security — unchanged posture. The app reaches Supabase only
--    through server-side routes using the service_role key, which bypasses
--    RLS; enabling it with no policies keeps the anon key locked out.
--    Per-user isolation is enforced by the queries.
-- --------------------------------------------------------------------------
alter table cards enable row level security;

do $$
begin
  execute 'alter view all_transactions set (security_invoker = true)';
exception
  when others then
    raise notice 'Could not set security_invoker on all_transactions (%).', sqlerrm;
end
$$;
