-- ============================================================
--  Adds a gate code to each apartment complex.
--
--  Keeps the code out of the name, so the name stays the name and
--  the code can be shown as its own pill and searched on its own.
--  Blank means no code, and nothing is shown.
-- ============================================================

alter table public.apartments add column if not exists code text;

select name, code from public.apartments order by name;
