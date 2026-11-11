-- Scene Timer alarms: keep each alarm's outcome for a day so a miss can be looked up.
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
alter table public.scene_alarms add column if not exists result text;

-- Handy check afterwards (your timer rows, newest first):
select id, unit, due_at at time zone 'America/Chicago' as due_local, sent_at, result
from public.scene_alarms order by created_at desc;
