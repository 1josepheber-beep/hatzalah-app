-- ============================================================
--  SUPPLY REQUEST ARCHIVE  (app 1.14.0, Nov 2026)
--
--  Requests marked In stock move to the "Archived" filter on their own
--  after "Supply Archive Days" (Settings, default 30). An admin can also
--  tap "Archive now" on any request, or "Unarchive" to bring one back
--  (kept = true stops the automatic rule from re-archiving it).
--  Nothing is ever deleted; archived requests stay readable.
--
--  Already applied to the live project on Nov 20, 2026 (through the
--  Supabase connector). Kept here so a fresh database can be rebuilt.
-- ============================================================

alter table public.supply_requests
  add column if not exists archived_at timestamptz,                  -- set by "Archive now"
  add column if not exists archived_by text not null default '',     -- who tapped it
  add column if not exists kept        boolean not null default false; -- "Unarchive": stay out of the archive

insert into public.settings (setting, value)
select 'Supply Archive Days', '30'
where not exists (select 1 from public.settings where lower(setting) = 'supply archive days');
