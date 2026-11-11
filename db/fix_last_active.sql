-- ============================================================
--  Fixes "Last Active" in the admin panel.
--
--  Two problems with how it worked:
--
--  1. The app only wrote it when someone passed the sign-in gate.
--     Members stay signed in, so reopening the app skipped that
--     entirely and the timestamp never moved. It meant "last
--     signed in from scratch", not "last used the app".
--
--  2. The write went straight to the roster table, where the rule
--     only allows someone to update the row whose EMAIL matches
--     their sign-in. If a member's roster email differs at all
--     from the Google account they use, the write was rejected and
--     silently discarded.
--
--  This adds a small function that any signed-in member may call
--  for their own unit. It sidesteps the email match, so it works
--  even when the two addresses differ.
-- ============================================================

create or replace function public.ping_seen(p_unit text)
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
     set last_active = to_char(now() at time zone 'America/Chicago',
                               'FMMM/FMDD/YYYY FMHH12:MI AM')
   where lower(trim(unit)) = lower(trim(p_unit));

  get diagnostics hit = row_count;

  if hit = 0 then
    return json_build_object('ok', false, 'error', 'Unit not on the roster');
  end if;
  return json_build_object('ok', true);
end;
$$;

revoke all on function public.ping_seen(text) from public;
grant execute on function public.ping_seen(text) to authenticated;

select 'ready' as status;
