-- ============================================================
--  Clears the certification email templates.
--
--  They were edited through a single-line box, which flattened
--  every paragraph break into a space. That is why the emails
--  arrive as one long run of text with odd wrapping.
--
--  Blank means the script uses its built-in wording, which has
--  the paragraph breaks intact. Set them again from the admin
--  once you have the new version, where the box is multi-line.
-- ============================================================

update public.settings set value = ''
where setting in (
  'Cert Email Body (expiring)',
  'Cert Email Body (expired)',
  'Cert Email Body (expired, non-blocking)',
  'Cert Email Body (renewed)'
);

select setting, value from public.settings
where setting ilike 'cert email%' order by setting;
