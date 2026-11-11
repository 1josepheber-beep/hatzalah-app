-- ============================================================
--  Makes anonymous polls actually anonymous.
--
--  THE PROBLEM WITH THE PREVIOUS VERSION
--  It wrote two rows back to back: the register row (who voted)
--  and the ballot row (what they chose). Because ids come from a
--  sequence, those two rows sat next to each other -- id 101 and
--  id 102. Anyone reading the table could pair them up and see
--  exactly who voted for what. It was private in the app and not
--  private at all in the database.
--
--  THE FIX
--  Individual ballots are not stored. Each choice is a counter
--  that goes up by one. There is no per-vote row left behind, so
--  there is nothing to line up against the register.
--
--  What still works: the tally, the turnout, and who has not voted.
--
--  Run this once. It also clears out any ballot rows the previous
--  version wrote, converting them into counts first.
-- ============================================================

create table if not exists public.poll_tallies (
  ann_id bigint not null,
  choice text not null,
  votes  integer not null default 0,
  primary key (ann_id, choice)
);

alter table public.poll_tallies enable row level security;

drop policy if exists "member read tallies" on public.poll_tallies;
create policy "member read tallies" on public.poll_tallies
  for select to authenticated using (public.is_member());

drop policy if exists "admin manage tallies" on public.poll_tallies;
create policy "admin manage tallies" on public.poll_tallies
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Carry across anything the old version recorded, then delete the rows
-- that made it traceable.
insert into public.poll_tallies (ann_id, choice, votes)
select ann_id, choice, count(*)
from   public.announcement_reads
where  action = 'ballot' and choice is not null
group  by ann_id, choice
on conflict (ann_id, choice) do update set votes = public.poll_tallies.votes + excluded.votes;

delete from public.announcement_reads where action = 'ballot';


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
    select true into already
      from public.announcement_reads
     where ann_id = p_ann_id
       and lower(trim(unit)) = lower(trim(p_unit))
     limit 1;

    if already then
      return json_build_object('ok', false, 'error', 'You have already voted in this poll');
    end if;

    -- the register: that they voted, never what
    insert into public.announcement_reads (ann_id, unit, action, choice)
    values (p_ann_id, trim(p_unit), 'voted', null);

    -- the count goes up by one. No row is created for this vote, so there is
    -- nothing that can be matched back to the person.
    insert into public.poll_tallies (ann_id, choice, votes)
    values (p_ann_id, coalesce(p_choice,''), 1)
    on conflict (ann_id, choice) do update
      set votes = public.poll_tallies.votes + 1;

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

-- confirm nothing traceable is left
select count(*) as leftover_ballot_rows
from   public.announcement_reads where action = 'ballot';
select * from public.poll_tallies order by ann_id, votes desc;
