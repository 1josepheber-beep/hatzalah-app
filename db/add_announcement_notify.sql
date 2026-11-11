-- ============================================================
--  ANNOUNCEMENTS: "Send a notification when I save this"
--
--  One extra column. New rows added in the admin portal start
--  with it ON; after the notification goes out the app clears
--  it, so a later edit never sends twice. Existing rows start
--  OFF (nothing is sent for anything already posted).
--
--  Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--  Run it BEFORE the app update goes live.
-- ============================================================

alter table public.announcements
  add column if not exists notify text default '';

-- Check: should list the new column.
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'announcements' and column_name = 'notify';
