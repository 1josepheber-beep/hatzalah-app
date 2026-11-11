-- ============================================================
--  Fixes removing a certification.
--
--  1. One-time certifications -- the ones with no expiration date,
--     where you write Success or Done (hazmat, evoc_course,
--     blood_borne_pathogen, administrator_of_record,
--     hipaa_awareness) -- could not be removed at all. The old
--     function only accepted column names ending in _exp and
--     answered "Bad column" for anything else.
--
--  2. Adds remove_certification_for_member(), so a certification
--     can be dropped for ONE person without deleting it for the
--     whole organization.
--
--  Safe to run more than once.
-- ============================================================

-- ---------- 1. remove for everyone (now handles one-time certs) ----------
create or replace function public.remove_certification(exp_column text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare base text; col_num text; dropped int := 0;
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'error', 'Admins only');
  end if;

  -- must look like a column name, and must never be one of the real fields
  if exp_column !~ '^[a-z0-9_]+$' then
    return json_build_object('ok', false, 'error', 'Bad column');
  end if;
  if exp_column in ('id','unit','first_name','last_name','paused') then
    return json_build_object('ok', false, 'error', 'That column cannot be removed');
  end if;

  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='certifications'
                   and column_name = exp_column) then
    return json_build_object('ok', false, 'error', 'Not found');
  end if;

  execute format('alter table public.certifications drop column if exists %I', exp_column);
  dropped := 1;

  -- a dated certification also has a matching number column
  if right(exp_column, 4) = '_exp' then
    base    := left(exp_column, length(exp_column) - 4);
    col_num := base || '_num';
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='certifications'
                 and column_name = col_num) then
      execute format('alter table public.certifications drop column if exists %I', col_num);
      dropped := 2;
    end if;
  end if;

  return json_build_object('ok', true, 'columns_removed', dropped);
end;
$$;

revoke all on function public.remove_certification(text) from public;
grant execute on function public.remove_certification(text) to authenticated;


-- ---------- 2. remove for ONE member only ----------
-- Marks it N/A for that person: they stop seeing it, stop being
-- reminded about it, and nobody else is affected.
create or replace function public.remove_certification_for_member(exp_column text, member_unit text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare base text; col_num text;
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'error', 'Admins only');
  end if;
  if exp_column !~ '^[a-z0-9_]+$' then
    return json_build_object('ok', false, 'error', 'Bad column');
  end if;
  if exp_column in ('id','unit','first_name','last_name','paused') then
    return json_build_object('ok', false, 'error', 'That column cannot be changed');
  end if;
  if coalesce(trim(member_unit),'') = '' then
    return json_build_object('ok', false, 'error', 'No member given');
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='certifications'
                   and column_name = exp_column) then
    return json_build_object('ok', false, 'error', 'Not found');
  end if;

  execute format('update public.certifications set %I = ''N/A'' where lower(trim(unit)) = lower(trim($1))', exp_column)
    using member_unit;

  if right(exp_column, 4) = '_exp' then
    base    := left(exp_column, length(exp_column) - 4);
    col_num := base || '_num';
    if exists (select 1 from information_schema.columns
               where table_schema='public' and table_name='certifications'
                 and column_name = col_num) then
      execute format('update public.certifications set %I = ''N/A'' where lower(trim(unit)) = lower(trim($1))', col_num)
        using member_unit;
    end if;
  end if;

  return json_build_object('ok', true, 'unit', member_unit);
end;
$$;

revoke all on function public.remove_certification_for_member(text, text) from public;
grant execute on function public.remove_certification_for_member(text, text) to authenticated;

-- check both exist
select routine_name
from   information_schema.routines
where  routine_schema = 'public'
  and  routine_name in ('remove_certification','remove_certification_for_member')
order  by routine_name;
