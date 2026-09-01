-- ===========================================================================
-- Migration 05 — Add "Fuel" and "Tea & Coffee" categories
--
-- Run this in your Supabase project's SQL editor, on top of the earlier
-- migrations. Safe to re-run.
--
-- Widens the category check constraints on `expenses` and `upi_expenses` to
-- accept the two new everyday categories the app now offers.
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
