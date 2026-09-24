-- ===========================================================================
-- Migration 07b — the all_transactions view, on its own
--
-- Section 5 of migration-07 did not take: `cards` and `billing_cycles.card_id`
-- both exist and the per-card unique index is in place, but the view still
-- has its old nine columns, so it carries no `card_id` / `card_name`.
--
-- Nothing is broken by that — the Expenses tab just labels every credit-card
-- row "Credit Card" instead of naming the card. This script is only the view,
-- so if it fails the error is unmissable rather than buried in a long run.
--
-- If it reports "cannot drop view ... because other objects depend on it",
-- change the drop to `drop view if exists all_transactions cascade;` and run
-- it again. If it reports "must be owner of view", run it from the Supabase
-- SQL editor rather than through a client.
-- ===========================================================================

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

do $$
begin
  execute 'alter view all_transactions set (security_invoker = true)';
exception
  when others then
    raise notice 'Could not set security_invoker on all_transactions (%).', sqlerrm;
end
$$;
