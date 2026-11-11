-- ============================================================
--  Fixes anonymous polls.
--
--  The first version stored an anonymous vote with no unit at all.
--  That kept the choice secret, but it also meant the app could
--  never tell whether someone had already voted -- so the banner
--  never cleared and the same person could vote repeatedly.
--
--  This works the way a paper ballot does. Two separate rows:
--
--    the register - unit, "voted", NO choice
--    the ballot   - no unit, just the choice
--
--  So you can see WHO voted and you can see the TALLY, but the two
--  cannot be joined. The ballot is also timestamped to midnight, so
--  the times can't be lined up to match a person to their choice.
--
--  Safe to run more than once.
-- ============================================================

create or replace function public.announcement_respond(
  p_ann_id bigint, p_unit text, p_action text, p_choice text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare anon boolean; k text; already boolean;
begin
  if not public.is_member() then
    return json_build_object('ok', false, 'error', 'Not a member');
  end if;
  if coalesce(trim(p_unit),'') = '' then
    return json_build_object('ok', false, 'error', 'No unit');
  end if;

  select coalesce(anonymous,'') = 'X', coalesce(kind,'feature')
    into anon, k
    from public.announcements where id = p_ann_id;

  if k is null then
    return json_build_object('ok', false, 'error', 'Not found');
  end if;

  if anon and k = 'poll' then
    -- Already on the register? Then they have voted, and an anonymous
    -- vote cannot be changed -- there is no way to find their ballot.
    select true into already
      from public.announcement_reads
     where ann_id = p_ann_id
       and lower(trim(unit)) = lower(trim(p_unit))
     limit 1;

    if already then
      return json_build_object('ok', false, 'error', 'You have already voted in this poll');
    end if;

    -- the register: who voted, never what
    insert into public.announcement_reads (ann_id, unit, action, choice)
    values (p_ann_id, trim(p_unit), 'voted', null);

    -- the ballot: the choice, no unit, no usable time
    insert into public.announcement_reads (ann_id, unit, action, choice, at)
    values (p_ann_id, '(ballot)', 'ballot', p_choice, date_trunc('day', now()));

    return json_build_object('ok', true, 'anonymous', true);
  end if;

  insert into public.announcement_reads (ann_id, unit, action, choice, at)
  values (p_ann_id, trim(p_unit), p_action, p_choice, now())
  on conflict (ann_id, unit) do update
    set action = excluded.action,
        choice = excluded.choice,
        at     = now();

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.announcement_respond(bigint, text, text, text) from public;
grant execute on function public.announcement_respond(bigint, text, text, text) to authenticated;

-- The ballot rows all share the unit '(ballot)', so the one-row-per-member
-- rule has to allow more than one of those.
drop index if exists uq_announcement_reads;
create unique index if not exists uq_announcement_reads
  on public.announcement_reads (ann_id, unit)
  where unit <> '(ballot)';

select 'ready' as status;
