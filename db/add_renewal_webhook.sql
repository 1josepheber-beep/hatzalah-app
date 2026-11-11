-- ============================================================
--  Instant renewal confirmation emails.
--
--  Adds the two settings the app needs to tell the reminder
--  script "this person just updated a date, check them now".
--
--  Pick any phrase you like for the secret -- it only has to
--  match on both sides. Change the URL after you deploy the
--  Apps Script (Deploy -> Manage deployments -> New version),
--  copying the /exec address it gives you.
-- ============================================================

insert into public.settings (setting, value)
select 'Renewal Webhook URL', 'PASTE_YOUR_EXEC_URL_HERE'
where not exists (select 1 from public.settings where setting = 'Renewal Webhook URL');

insert into public.settings (setting, value)
select 'Renewal Webhook Secret', 'change-this-to-any-phrase'
where not exists (select 1 from public.settings where setting = 'Renewal Webhook Secret');

-- The Apps Script reads the SAME secret from this table, under this exact name.
insert into public.settings (setting, value)
select 'renewal webhook secret', 'change-this-to-any-phrase'
where not exists (select 1 from public.settings where setting = 'renewal webhook secret');

select setting, value from public.settings
where setting ilike 'renewal webhook%'
order by setting;
