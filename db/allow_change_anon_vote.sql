-- ============================================================
--  Lets someone change an anonymous vote.
--
--  The server still never learns who chose what. The member's own
--  phone remembers their choice, and to change it the app says
--  "take one off X, put one on Y". The database checks only that
--  the person is on the register for this poll -- it is never told
--  which of those two choices was theirs.
--
--  Run after fix_anonymous_polls_v2.sql.
-- ============================================================

create or replace function public.announcement_change_vote(
  p_ann_id bigint, p_unit text, p_old text, p_new text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare anon boolean; k text; on_register boolean; have integer;
begin
  if not public.is_member() then
    return json_build_object('ok', false, 'error', 'Not a member');
  end if;

  select coalesce(anonymous,'') = 'X', coalesce(kind,'feature')
    into anon, k
    from public.announcements where id = p_ann_id;

  if k is null or k <> 'poll' then
    return json_build_object('ok', false, 'error', 'Not a poll');
  end if;
  if not anon then
    return json_build_object('ok', false, 'error', 'Use the normal vote for a named poll');
  end if;
  if coalesce(trim(p_old),'') = '' or coalesce(trim(p_new),'') = '' then
    return json_build_object('ok', false, 'error', 'Missing choice');
  end if;
  if trim(p_old) = trim(p_new) then
    return json_build_object('ok', true, 'unchanged', true);
  end if;

  -- They must already be on the register, or this would be a way to move
  -- other people's votes around without having voted at all.
  select true into on_register
    from public.announcement_reads
   where ann_id = p_ann_id
     and lower(trim(unit)) = lower(trim(p_unit))
   limit 1;

  if not on_register then
    return json_build_object('ok', false, 'error', 'You have not voted in this poll');
  end if;

  -- Don't let a count go below zero if a phone sends a stale old choice.
  select votes into have from public.poll_tallies
   where ann_id = p_ann_id and choice = trim(p_old);
  if have is null or have < 1 then
    return json_build_object('ok', false, 'error', 'That vote could not be found');
  end if;

  update public.poll_tallies
     set votes = votes - 1
   where ann_id = p_ann_id and choice = trim(p_old);

  insert into public.poll_tallies (ann_id, choice, votes)
  values (p_ann_id, trim(p_new), 1)
  on conflict (ann_id, choice) do update
    set votes = public.poll_tallies.votes + 1;

  return json_build_object('ok', true);
end;
$$;

revoke all on function public.announcement_change_vote(bigint, text, text, text) from public;
grant execute on function public.announcement_change_vote(bigint, text, text, text) to authenticated;

select 'ready' as status;
