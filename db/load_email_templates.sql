-- ============================================================
--  Writes the built-in email wording into your settings, so you
--  can see it in the admin and edit from there rather than
--  starting from a blank box.
--
--  Deploy version 19.7 FIRST. Earlier versions edit these in a
--  single-line box, which would flatten the paragraphs again.
--
--  Placeholders, which the script fills in:
--     {name}   the member's name
--     {unit}   their unit, e.g. H-24
--     {cert}   the certification
--     {date}   the expiration date
--     {days}   days until it expires
--     {link}   the app address
-- ============================================================

update public.settings s
set    value = v.val
from  (values
  ('Cert Email Subject (expiring)', 'Reminder: your {cert} expires in {days} days — Hatzalah of Houston'),
  ('Cert Email Body (expiring)', 'Hi {name} ({unit}),

This is a reminder that your {cert} will expire in {days} days, on {date}. Please remember to renew it before the expiration date.

To renew it in our system: open the Hatzalah of Houston app (https://houstonhatzalahapp.org), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.

Thank you very much for your attention to this matter.

Sincerely,
Hatzalah of Houston Administration'),
  ('Cert Email Subject (expired)', 'Your {cert} has expired — Hatzalah of Houston'),
  ('Cert Email Body (expired)', 'Hi {name} ({unit}),

Your {cert} has expired. You are not permitted to respond to medical emergencies until your certification has been renewed, is up to date, and has been updated in our system.

To renew it in our system: open the Hatzalah of Houston app (https://houstonhatzalahapp.org), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.

Sincerely,
Hatzalah of Houston Administration'),
  ('Cert Email Subject (expired, non-blocking)', 'Action needed: your {cert} has expired — Hatzalah of Houston'),
  ('Cert Email Body (expired, non-blocking)', 'Hi {name} ({unit}),

Your {cert} expired on {date}. This one does not stop you responding to patients, but it is required to stay current with the organization, and some duties may depend on it.

Please renew it as soon as you can.

To renew it in our system: open the Hatzalah of Houston app (https://houstonhatzalahapp.org), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.

Thank you very much for your attention to this matter.

Sincerely,
Hatzalah of Houston Administration'),
  ('Cert Email Subject (renewed)', 'Thank you — your {cert} is up to date'),
  ('Cert Email Body (renewed)', 'Hi {name} ({unit}),

Thank you — your {cert} has been updated in our system and now expires {date}. No further action is needed for this one.

Sincerely,
Hatzalah of Houston Administration')
      ) as v(name, val)
where  lower(trim(s.setting)) = lower(trim(v.name));

insert into public.settings (setting, value)
select v.name, v.val
from  (values
  ('Cert Email Subject (expiring)', 'Reminder: your {cert} expires in {days} days — Hatzalah of Houston'),
  ('Cert Email Body (expiring)', 'Hi {name} ({unit}),

This is a reminder that your {cert} will expire in {days} days, on {date}. Please remember to renew it before the expiration date.

To renew it in our system: open the Hatzalah of Houston app (https://houstonhatzalahapp.org), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.

Thank you very much for your attention to this matter.

Sincerely,
Hatzalah of Houston Administration'),
  ('Cert Email Subject (expired)', 'Your {cert} has expired — Hatzalah of Houston'),
  ('Cert Email Body (expired)', 'Hi {name} ({unit}),

Your {cert} has expired. You are not permitted to respond to medical emergencies until your certification has been renewed, is up to date, and has been updated in our system.

To renew it in our system: open the Hatzalah of Houston app (https://houstonhatzalahapp.org), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.

Sincerely,
Hatzalah of Houston Administration'),
  ('Cert Email Subject (expired, non-blocking)', 'Action needed: your {cert} has expired — Hatzalah of Houston'),
  ('Cert Email Body (expired, non-blocking)', 'Hi {name} ({unit}),

Your {cert} expired on {date}. This one does not stop you responding to patients, but it is required to stay current with the organization, and some duties may depend on it.

Please renew it as soon as you can.

To renew it in our system: open the Hatzalah of Houston app (https://houstonhatzalahapp.org), tap Certifications, enter the new expiration date, and upload a copy of your renewed certification when prompted.

Thank you very much for your attention to this matter.

Sincerely,
Hatzalah of Houston Administration'),
  ('Cert Email Subject (renewed)', 'Thank you — your {cert} is up to date'),
  ('Cert Email Body (renewed)', 'Hi {name} ({unit}),

Thank you — your {cert} has been updated in our system and now expires {date}. No further action is needed for this one.

Sincerely,
Hatzalah of Houston Administration')
      ) as v(name, val)
where  not exists (select 1 from public.settings s
                   where lower(trim(s.setting)) = lower(trim(v.name)));

select setting, value from public.settings
where  setting ilike 'cert email%' order by setting;
