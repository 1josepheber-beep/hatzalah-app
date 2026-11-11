-- ============================================================
--  Lets admins add a new certification from inside the app.
--  Creates the two columns (number + expiry) for a certification.
--  Only signed-in admins can run it, and the name is sanitised so
--  nothing but a plain column can ever be created.
-- ============================================================
create or replace function public.add_certification(cert_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  base text;
  col_num text;
  col_exp text;
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'error', 'Admins only');
  end if;

  -- "CPR Instructor" -> cpr_instructor
  base := lower(trim(coalesce(cert_name,'')));
  base := regexp_replace(base, '[^a-z0-9]+', '_', 'g');
  base := regexp_replace(base, '^_+|_+$', '', 'g');
  base := regexp_replace(base, '_+', '_', 'g');

  if base = '' then
    return json_build_object('ok', false, 'error', 'Enter a name');
  end if;
  if length(base) > 50 then
    return json_build_object('ok', false, 'error', 'That name is too long');
  end if;
  if base ~ '^[0-9]' then
    base := 'c_' || base;
  end if;

  col_num := base || '_num';
  col_exp := base || '_exp';

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='certifications'
               and column_name = col_exp) then
    return json_build_object('ok', false, 'error', 'That certification already exists');
  end if;

  execute format('alter table public.certifications add column %I text', col_num);
  execute format('alter table public.certifications add column %I text', col_exp);

  return json_build_object('ok', true, 'base', base, 'num', col_num, 'exp', col_exp);
end;
$$;

revoke all on function public.add_certification(text) from public;
grant execute on function public.add_certification(text) to authenticated;

-- ============================================================
--  Remove a certification entirely (drops both columns).
-- ============================================================
create or replace function public.remove_certification(exp_column text)
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
  if exp_column !~ '^[a-z0-9_]+_exp$' then
    return json_build_object('ok', false, 'error', 'Bad column');
  end if;
  if not exists (select 1 from information_schema.columns
                 where table_schema='public' and table_name='certifications'
                   and column_name = exp_column) then
    return json_build_object('ok', false, 'error', 'Not found');
  end if;
  base := left(exp_column, length(exp_column)-4);
  col_num := base || '_num';
  execute format('alter table public.certifications drop column if exists %I', exp_column);
  execute format('alter table public.certifications drop column if exists %I', col_num);
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.remove_certification(text) from public;
grant execute on function public.remove_certification(text) to authenticated;
