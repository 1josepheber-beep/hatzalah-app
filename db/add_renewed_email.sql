-- Optional wording override for the "you renewed it" confirmation.
-- Leave blank to use the built-in wording, which adapts automatically:
--   * non-blocking cert  -> quiet thank-you
--   * blocking, all clear -> "You are cleared to respond"
--   * blocking, others still expired -> "still not cleared", naming them
insert into public.settings (setting, value)
select v.setting, v.value from (values
  ('Cert Email Subject (renewed)', ''),
  ('Cert Email Body (renewed)', '')
) as v(setting, value)
where not exists (
  select 1 from public.settings s where lower(trim(s.setting)) = lower(trim(v.setting))
);
