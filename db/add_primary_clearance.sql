-- ============================================================
--  CLEARED AS PRIMARY  (app 1.17.0, Nov 2026)
--
--  Call numbers never make anyone a Primary: a member must be cleared
--  first. Admin -> Members carries the tick, the date and who cleared
--  them; the app refuses to save a status of Primary without it.
--  Clearance does not expire, so a Primary who drops to Backup for
--  missed quarters keeps it and can be put back without re-clearing.
--
--  Applied to the live project on Nov 22, 2026, and everyone then
--  standing as Primary (plus H-29, a former Primary) was backfilled.
-- ============================================================

alter table public.roster
  add column if not exists cleared_primary    text not null default '',   -- 'X' or ''
  add column if not exists cleared_primary_at text not null default '',   -- 'YYYY-MM-DD'
  add column if not exists cleared_primary_by text not null default '';   -- 'Name (Unit)'

-- one-off backfill
-- update public.roster set cleared_primary='X', cleared_primary_at='2026-11-22',
--   cleared_primary_by='Backfilled from existing standing'
-- where lower(trim(coalesce(status,'')))='primary';
