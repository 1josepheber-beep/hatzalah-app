-- ============================================================
--  "Last opened the app ... on version X"
--
--  The open ping already records WHEN a member last opened the
--  app. It now also records WHICH VERSION the phone was running,
--  so the admin portal can show who is behind after a release.
--
--  Run once in Supabase: SQL Editor -> New query -> paste -> Run.
--  Safe to run before the app update: the current app keeps
--  calling the ping without a version and still works.
-- ============================================================

alter table public.roster add column if not exists last_version text default '';

-- Replace the one-argument ping with one that also takes the version.
-- (The old signature must go, or the database can't tell them apart.)
drop function if exists public.ping_seen(text);

create or replace function public.ping_seen(p_unit text, p_version text default '')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare hit int;
begin
  if not public.is_member() then
    return json_build_object('ok', false, 'error', 'Not a member');
  end if;
  if coalesce(trim(p_unit),'') = '' then
    return json_build_object('ok', false, 'error', 'No unit');
  end if;

  update public.roster
     set last_active  = to_char(now() at time zone 'America/Chicago', 'FMMM/FMDD/YYYY FMHH12:MI AM'),
         last_version = case when coalesce(trim(p_version),'') = '' then last_version else trim(p_version) end
   where lower(trim(unit)) = lower(trim(p_unit));

  get diagnostics hit = row_count;

  if hit = 0 then
    return json_build_object('ok', false, 'error', 'Unit not on the roster');
  end if;
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.ping_seen(text, text) from public;
grant execute on function public.ping_seen(text, text) to authenticated;

-- Check: the column exists and the function has two arguments.
select column_name from information_schema.columns
 where table_schema='public' and table_name='roster' and column_name='last_version';
select pg_get_function_identity_arguments(p.oid) as ping_seen_args
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname='ping_seen';
