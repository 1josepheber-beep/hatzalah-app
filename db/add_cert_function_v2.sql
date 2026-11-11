-- ============================================================
--  Adding a certification from a member's record now applies it to
--  THAT MEMBER ONLY. Everyone else is marked N/A automatically, so it
--  stays off their screen and out of their reminder emails.
--  Pass only_unit = '' to give it to everybody instead.
-- ============================================================
drop function if exists public.add_certification(text);

create or replace function public.add_certification(cert_name text, only_unit text default '')
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  base text; col_num text; col_exp text; u text;
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'error', 'Admins only');
  end if;

  base := lower(trim(coalesce(cert_name,'')));
  base := regexp_replace(base, '[^a-z0-9]+', '_', 'g');
  base := regexp_replace(base, '^_+|_+$', '', 'g');
  base := regexp_replace(base, '_+', '_', 'g');

  if base = '' then return json_build_object('ok', false, 'error', 'Enter a name'); end if;
  if length(base) > 50 then return json_build_object('ok', false, 'error', 'That name is too long'); end if;
  if base ~ '^[0-9]' then base := 'c_' || base; end if;

  col_num := base || '_num';
  col_exp := base || '_exp';

  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='certifications' and column_name = col_exp) then
    return json_build_object('ok', false, 'error', 'That certification already exists');
  end if;

  execute format('alter table public.certifications add column %I text', col_num);
  execute format('alter table public.certifications add column %I text', col_exp);

  u := trim(coalesce(only_unit,''));
  if u <> '' then
    -- everyone except this member gets N/A
    execute format(
      'update public.certifications set %I = ''N/A'' where lower(regexp_replace(coalesce(unit,''''),''[^a-zA-Z0-9]'','''',''g'')) <> lower(regexp_replace($1,''[^a-zA-Z0-9]'','''',''g''))',
      col_exp) using u;
  end if;

  return json_build_object('ok', true, 'base', base, 'exp', col_exp, 'only_unit', u);
end;
$$;

revoke all on function public.add_certification(text, text) from public;
grant execute on function public.add_certification(text, text) to authenticated;
