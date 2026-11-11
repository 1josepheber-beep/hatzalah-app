-- ============================================================
--  Guest demo without opening the database
--  A guest is NOT signed in, so they get no table access at all.
--  This function checks the passcode and returns only what the
--  demo needs (tiles + settings). Nothing else is reachable.
-- ============================================================
create or replace function public.guest_demo(code text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  demo_on boolean;
  gname text;
  tiles_json json;
  settings_json json;
begin
  -- is the demo switched on?
  select coalesce(lower(trim(value)) not in ('off','no','false','0','disabled'), true)
    into demo_on
  from public.settings
  where lower(trim(setting)) = 'guest demo'
  limit 1;

  if demo_on is null then demo_on := true; end if;
  if not demo_on then
    return json_build_object('ok', false, 'error', 'off');
  end if;

  -- valid, active passcode?
  select coalesce(g.name,'Guest') into gname
  from public.guests g
  where lower(trim(g.passcode)) = lower(trim(code))
    and coalesce(lower(trim(g.active)),'x') in ('x','yes','true','')
  limit 1;

  if gname is null then
    return json_build_object('ok', false, 'error', 'bad code');
  end if;

  select coalesce(json_agg(t), '[]'::json) into tiles_json from public.tiles t;
  select coalesce(json_object_agg(s.setting, s.value), '{}'::json) into settings_json
    from public.settings s where s.setting is not null;

  return json_build_object('ok', true, 'name', gname, 'tiles', tiles_json, 'settings', settings_json);
end;
$$;

-- anyone may CALL it (it validates the code itself); nobody gains table access
revoke all on function public.guest_demo(text) from public;
grant execute on function public.guest_demo(text) to anon, authenticated;
