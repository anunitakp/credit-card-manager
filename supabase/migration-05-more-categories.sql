-- ===========================================================================
-- Migration 05 — Fuel and Tea & Coffee categories
--
-- Run this AFTER migration-04. Safe to re-run, and a no-op on a database
-- where the constraints were already widened by hand.
--
-- The app's category list gained "Fuel" and "Tea & Coffee". This records that
-- change in the migration history so a fresh database built from schema.sql
-- plus these files ends up matching `CATEGORIES` in lib/types.ts — without it,
-- a new setup would reject both categories even though the existing database
-- accepts them.
--
-- Keep these three in step: lib/types.ts, this constraint, and the icons in
-- components/CategoryIcon.tsx. Adding a category to the app without adding it
-- here is the failure this migration exists to fix.
-- ===========================================================================

alter table expenses drop constraint if exists expenses_category_check;
alter table expenses add constraint expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Fuel', 'Tea & Coffee', 'Culture', 'Books & Subscription',
    'Therapy', 'Gift', 'Electronics', 'Trip', 'Miscellaneous'
  )
);

alter table upi_expenses drop constraint if exists upi_expenses_category_check;
alter table upi_expenses add constraint upi_expenses_category_check check (
  category in (
    'Food', 'Groceries', 'Household', 'Dressing', 'Beauty', 'Skincare',
    'Transport', 'Fuel', 'Tea & Coffee', 'Culture', 'Books & Subscription',
    'Therapy', 'Gift', 'Electronics', 'Trip', 'Miscellaneous'
  )
);
