-- Adds the setting that holds the days before expiry on which a reminder goes out.
-- The reminder script and the app both read it. Edit it in the admin any time.
insert into public.settings (setting, value)
select 'Cert Reminder Milestones', '90, 60, 30, 14, 7, 3, 1'
where not exists (select 1 from public.settings where lower(trim(setting)) = 'cert reminder milestones');

select setting, value from public.settings
where setting in ('Cert Reminder Days', 'Cert Reminder Milestones') order by setting;
