-- Which certifications actually stop someone responding to patients.
-- Anything NOT listed still sends reminders, just without telling them
-- they can't respond.
--
-- NREMT is deliberately NOT here: the state licence is what authorises
-- patient care. If the state licence lapses, that one blocks.
--
-- Use the names exactly as they appear in the app, comma separated.
-- Leave the value blank to treat every certification as blocking.
insert into public.settings (setting, value)
select v.setting, v.value from (values
  ('Certifications That Block Response',
   'State EMT/Paramedic License, American Heart BLS'),
  ('Cert Email Subject (expired, non-blocking)', ''),
  ('Cert Email Body (expired, non-blocking)', '')
) as v(setting, value)
where not exists (
  select 1 from public.settings s where lower(trim(s.setting)) = lower(trim(v.setting))
);

-- If you already ran the earlier version, this updates it:
update public.settings
   set value = 'State EMT/Paramedic License, American Heart BLS'
 where lower(trim(setting)) = 'certifications that block response'
   and value ilike '%NREMT%';

select setting, value from public.settings
 where lower(setting) like '%block%';
