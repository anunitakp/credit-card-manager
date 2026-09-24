-- ===========================================================================
-- Migration 08 — Vehicle and Fuel become one category
--
-- Run this AFTER migration-07 (and 07b). Safe to re-run.
--
-- "Vehicle" and "Fuel" are folded into a single "Vehicle & Fuel". Every
-- transaction in either lands in the merged category, so nothing is lost and
-- nothing needs re-categorising by hand.
--
-- Order matters: the old constraint has to come off before the rows can be
-- rewritten, and the new one goes on only once every row satisfies it.
-- ===========================================================================

alter table expenses      drop constraint if exists expenses_category_check;
alter table upi_expenses  drop constraint if exists upi_expenses_category_check;

update expenses     set category = 'Vehicle & Fuel' where category in ('Vehicle', 'Fuel');
update upi_expenses set category = 'Vehicle & Fuel' where category in ('Vehicle', 'Fuel');

-- --------------------------------------------------------------------------
-- Budgets need more care than a rename.
--
-- There is one budget row per (user, category), so an account holding BOTH a
-- Vehicle budget and a Fuel budget would collide on that unique index the
-- moment both rows were renamed to the same category. The two amounts are
-- summed into a single row instead — which is also the only answer that
-- keeps the merged budget meaning what the two separate ones meant.
-- --------------------------------------------------------------------------
-- 'Vehicle & Fuel' is included in the merge set so a partial earlier run
-- folds back in cleanly instead of colliding on the unique index.
with merged as (
  select user_id, sum(amount) as amount
  from budgets
  where category in ('Vehicle', 'Fuel', 'Vehicle & Fuel')
  group by user_id
),
removed as (
  delete from budgets where category in ('Vehicle', 'Fuel', 'Vehicle & Fuel')
)
insert into budgets (user_id, category, amount)
select user_id, 'Vehicle & Fuel', amount from merged;

alter table expenses add constraint expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Vehicle & Fuel', 'Tea & Coffee', 'Culture',
    'Books & Subscription', 'Health & Fitness', 'Gift', 'Electronics',
    'Trip', 'Miscellaneous'
  )
);

alter table upi_expenses add constraint upi_expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Vehicle & Fuel', 'Tea & Coffee', 'Culture',
    'Books & Subscription', 'Health & Fitness', 'Gift', 'Electronics',
    'Trip', 'Miscellaneous'
  )
);

-- Keep these in step: lib/types.ts (CATEGORIES), these two constraints, the
-- colours in lib/category-meta.ts and the icons in components/CategoryIcon.tsx.
