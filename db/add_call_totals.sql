-- ============================================================
--  ORGANIZATION CALL TOTALS  (app 1.23.0, Nov 2026)
--
--  How many calls Hatzalah ran in a quarter, counted as distinct incident
--  numbers in the daily ESO export. Members can read it; it is shown on My
--  Standing only when the setting "Standings Show Total Calls" is On
--  (ships Off).
-- ============================================================
create table if not exists public.call_totals (
  period      text primary key,              -- '2026-Q4'
  total       integer not null default 0,    -- distinct incidents
  source      text not null default 'eso',
  updated_at  timestamptz not null default now()
);
revoke all on public.call_totals from anon;
grant select, insert, update, delete on public.call_totals to authenticated;
alter table public.call_totals enable row level security;
drop policy if exists "member read" on public.call_totals;
create policy "member read" on public.call_totals for select to authenticated using (public.is_member());
drop policy if exists "admin write" on public.call_totals;
create policy "admin write" on public.call_totals for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.settings (setting, value)
select 'Standings Show Total Calls', 'Off'
where not exists (select 1 from public.settings s where lower(trim(s.setting)) = 'standings show total calls');
