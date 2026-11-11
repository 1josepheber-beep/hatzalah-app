-- ============================================================
--  Hatzalah of Houston — SECURITY LOCKDOWN
--  Replaces the temporary "anyone can do anything" test rules.
--  Run this ONCE in the SQL Editor. Safe to re-run.
-- ============================================================

-- 1. Remove the wide-open test policies from every table
do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('drop policy if exists "test insert" on public.%I', t);
    execute format('drop policy if exists "test update" on public.%I', t);
    execute format('drop policy if exists "test delete" on public.%I', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- 2. The anonymous key can no longer touch anything.
--    Only signed-in people get access from here on.
revoke all on all tables in schema public from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- 3. Helper: is the signed-in person an active admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.roster r
    where lower(trim(r.email)) = lower(trim(coalesce(auth.jwt() ->> 'email','')))
      and lower(trim(coalesce(r.admin,''))) in ('x','yes','true')
      and lower(trim(coalesce(r.active,''))) not in ('no','off','false','0')
  );
$$;

-- 4. Helper: the signed-in person's own unit
create or replace function public.my_unit()
returns text
language sql stable security definer set search_path = public
as $$
  select r.unit from public.roster r
  where lower(trim(r.email)) = lower(trim(coalesce(auth.jwt() ->> 'email','')))
  limit 1;
$$;

-- 5. Helper: is this person on the roster at all (and active)?
create or replace function public.is_member()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.roster r
    where lower(trim(r.email)) = lower(trim(coalesce(auth.jwt() ->> 'email','')))
      and lower(trim(coalesce(r.active,''))) not in ('no','off','false','0')
  );
$$;

-- ============================================================
--  REFERENCE TABLES — every signed-in member may read.
--  Only admins may change them.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['settings','tiles','hospitals','apartments','apartment_markers',
                           'vitals','cpr_buttons','uploads','task_list','guests']
  loop
    execute format('drop policy if exists "member read" on public.%I', t);
    execute format('create policy "member read" on public.%I for select to authenticated using (public.is_member())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ============================================================
--  ROSTER — members read the directory; you may only edit YOUR OWN row.
--  Admins may edit anyone. Nobody but an admin can add or delete people.
-- ============================================================
drop policy if exists "member read" on public.roster;
create policy "member read" on public.roster
  for select to authenticated using (public.is_member());

drop policy if exists "self update" on public.roster;
create policy "self update" on public.roster
  for update to authenticated
  using ( lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email',''))) or public.is_admin() )
  with check ( lower(trim(email)) = lower(trim(coalesce(auth.jwt() ->> 'email',''))) or public.is_admin() );

drop policy if exists "admin insert" on public.roster;
create policy "admin insert" on public.roster
  for insert to authenticated with check (public.is_admin());

drop policy if exists "admin delete" on public.roster;
create policy "admin delete" on public.roster
  for delete to authenticated using (public.is_admin());

-- ============================================================
--  CERTIFICATIONS — members read; members may update their own dates;
--  admins may do anything.
-- ============================================================
drop policy if exists "member read" on public.certifications;
create policy "member read" on public.certifications
  for select to authenticated using (public.is_member());

drop policy if exists "self or admin update" on public.certifications;
create policy "self or admin update" on public.certifications
  for update to authenticated
  using ( lower(trim(coalesce(unit,''))) = lower(trim(coalesce(public.my_unit(),'~none~'))) or public.is_admin() )
  with check ( lower(trim(coalesce(unit,''))) = lower(trim(coalesce(public.my_unit(),'~none~'))) or public.is_admin() );

drop policy if exists "admin ins del" on public.certifications;
create policy "admin ins del" on public.certifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
--  TASK PROGRESS — members read; any active member may write
--  (FTOs confirm other people's tasks, so this stays open to members).
-- ============================================================
drop policy if exists "member all" on public.task_progress;
create policy "member all" on public.task_progress
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- ============================================================
--  SCHEDULE / AVAILABILITY — members manage their own; admins see all.
-- ============================================================
drop policy if exists "member read" on public.schedule;
create policy "member read" on public.schedule
  for select to authenticated using (public.is_member());
drop policy if exists "own write" on public.schedule;
create policy "own write" on public.schedule
  for all to authenticated
  using ( lower(trim(coalesce(unit,''))) = lower(trim(coalesce(public.my_unit(),'~none~'))) or public.is_admin() )
  with check ( lower(trim(coalesce(unit,''))) = lower(trim(coalesce(public.my_unit(),'~none~'))) or public.is_admin() );

drop policy if exists "member all" on public.availability;
create policy "member all" on public.availability
  for all to authenticated using (public.is_member()) with check (public.is_member());

-- ============================================================
--  LOGS — members may add entries; only admins may read or remove them.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['code_logs','changes','cert_updates','cert_reminders']
  loop
    execute format('drop policy if exists "member insert" on public.%I', t);
    execute format('create policy "member insert" on public.%I for insert to authenticated with check (public.is_member())', t);
    execute format('drop policy if exists "admin read" on public.%I', t);
    execute format('create policy "admin read" on public.%I for select to authenticated using (public.is_admin())', t);
    execute format('drop policy if exists "admin manage" on public.%I', t);
    execute format('create policy "admin manage" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Done. The anonymous key can no longer read or write anything.
-- The Apps Script uses the service_role key, which bypasses all of this by design.
