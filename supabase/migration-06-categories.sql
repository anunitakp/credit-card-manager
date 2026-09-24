-- ===========================================================================
-- Migration 06 — Vehicle category, and Therapy renamed to Health & Fitness
--
-- Run this AFTER migration-05. Safe to re-run.
--
-- Two changes to the category list:
--   * "Vehicle" is added, for spending on the vehicle itself (servicing,
--     insurance, repairs) as distinct from "Transport", which is the cost of
--     getting somewhere, and "Fuel".
--   * "Therapy" becomes "Health & Fitness", which covers the same spending
--     plus the gym and the doctor.
--
-- The rename rewrites existing rows rather than keeping both names, so the
-- history stays in one bucket — a chart that showed "Therapy" for the first
-- half of the year and "Health & Fitness" for the second would be reporting
-- a split that never happened.
--
-- Order matters: the old constraint has to come off before the rows can be
-- rewritten, and the new one goes on only once every row satisfies it.
-- ===========================================================================

alter table expenses      drop constraint if exists expenses_category_check;
alter table upi_expenses  drop constraint if exists upi_expenses_category_check;

update expenses     set category = 'Health & Fitness' where category = 'Therapy';
update upi_expenses set category = 'Health & Fitness' where category = 'Therapy';

-- Budgets carry a category name too, and a budget left pointing at "Therapy"
-- would silently stop matching any spending.
update budgets      set category = 'Health & Fitness' where category = 'Therapy';

alter table expenses add constraint expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Vehicle', 'Fuel', 'Tea & Coffee', 'Culture',
    'Books & Subscription', 'Health & Fitness', 'Gift', 'Electronics',
    'Trip', 'Miscellaneous'
  )
);

alter table upi_expenses add constraint upi_expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Vehicle', 'Fuel', 'Tea & Coffee', 'Culture',
    'Books & Subscription', 'Health & Fitness', 'Gift', 'Electronics',
    'Trip', 'Miscellaneous'
  )
);

-- Keep these in step: lib/types.ts (CATEGORIES), these two constraints, the
-- colours in lib/category-meta.ts and the icons in components/CategoryIcon.tsx.
