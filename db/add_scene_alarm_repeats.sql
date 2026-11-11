-- Scene Timer: ring again every minute until Snooze or End.
-- Adds the repeat counter and the admin setting (default 5 extra rings).
-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.
alter table public.scene_alarms add column if not exists repeats integer not null default 0;

insert into public.settings (setting, value)
select 'Scene Alarm Repeats', '5' where not exists (select 1 from public.settings where setting = 'Scene Alarm Repeats');

-- Check: should show the setting with its value.
select setting, value from public.settings where setting = 'Scene Alarm Repeats';
