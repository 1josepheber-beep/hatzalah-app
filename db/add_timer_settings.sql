-- Scene Timer settings. Times are in MINUTES. Leave a row out to use the default.
insert into public.settings (setting, value)
select v.setting, v.value from (values
  ('Scene Timer Minutes',        '10'),
  ('Scene Timer Snooze Minutes', '5'),
  ('Scene Reminder Minutes',     '45'),
  ('Scene Timer Message',        'Time to reassess the scene.'),
  ('Scene Reminder Message',     'Scene timer still running (45+ min). Close the timer or close the app.')
) as v(setting, value)
where not exists (
  select 1 from public.settings s where lower(trim(s.setting)) = lower(trim(v.setting))
);

select setting, value from public.settings order by setting;
