-- ===========================================================================
-- Migration 09 — Cards can be archived, and can no longer take data with them
--
-- Run this AFTER migration-08. Safe to re-run.
--
-- Deleting a card used to cascade: card → its months → every expense on them.
-- One click, and years of history were gone with no undo. This migration
-- makes that structurally impossible rather than merely discouraged.
--
-- Two changes:
--
--   1. `archived_at` — retiring a card is now a reversible flag, not a
--      delete. An archived card leaves the switcher; its expenses stay in
--      every total, chart and archive exactly as before.
--
--   2. The expenses → billing_cycles foreign key becomes RESTRICT. Deleting
--      a card still cascades to its (empty) months, but the moment any one
--      of those months holds a single expense, Postgres refuses the whole
--      delete. The guarantee no longer depends on the app asking nicely:
--      a card with spending on it cannot be deleted by any code path, by
--      hand in the SQL editor, or by a future bug.
--
-- The app pairs this with the matching rule in the interface — Archive for a
-- card with history, Delete only for one with nothing on it — so the two
-- agree, but the database is the one that enforces it.
-- ===========================================================================

-- --------------------------------------------------------------------------
-- 1. Archiving
-- --------------------------------------------------------------------------
alter table cards add column if not exists archived_at timestamptz;

-- Most reads want only the live cards, and there are few archived ones.
create index if not exists cards_user_active_idx on cards (user_id) where archived_at is null;

-- --------------------------------------------------------------------------
-- 2. Expenses pin their month in place
--
--    Dropped and recreated because a foreign key's delete action cannot be
--    altered in place. The constraint name is the default Postgres assigns,
--    so this matches whether the table came from schema.sql or from a later
--    migration; the `if exists` keeps a re-run quiet.
-- --------------------------------------------------------------------------
alter table expenses drop constraint if exists expenses_cycle_id_fkey;
alter table expenses add constraint expenses_cycle_id_fkey
  foreign key (cycle_id) references billing_cycles (id) on delete restrict;

-- --------------------------------------------------------------------------
-- 3. A note on deleting an account
--
--    `billing_cycles.user_id` still cascades from `users`, so deleting a
--    user row now fails if that user has any credit-card expense — the
--    RESTRICT above blocks it. That is deliberate. Deleting an account was
--    never something the app offers, and having it refuse loudly rather than
--    quietly shred a spending history is the safer of the two failures.
--    To retire an account, archive its cards instead.
-- --------------------------------------------------------------------------
