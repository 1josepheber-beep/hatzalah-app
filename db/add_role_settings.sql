-- Optional: control the Type / Level / Status dropdowns from Settings.
-- Leave these out and the app uses its built-in lists.
-- Comma separated, in the order you want them to appear.
insert into public.settings (setting, value)
select v.setting, v.value from (values
  ('Member Levels',   'EMT, AEMT, ALS, Doctor, PR'),
  ('Member Types',    'Responder, Non Responder, Dispatcher'),
  ('Member Statuses', 'Primary, Backup, Observer, Dispatcher')
) as v(setting, value)
where not exists (
  select 1 from public.settings s where lower(trim(s.setting)) = lower(trim(v.setting))
);

select setting, value from public.settings
 where setting in ('Member Levels','Member Types','Member Statuses');
