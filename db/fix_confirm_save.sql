-- ============================================================
--  Fixes "couldn't save" on confirmations and named poll votes.
--
--  An earlier step made the unique index PARTIAL:
--      ... (ann_id, unit) where unit <> '(ballot)'
--  because anonymous ballots were being stored as rows sharing a
--  fake unit. Postgres will not use a partial index for
--  "on conflict (ann_id, unit)", so every save through that path
--  failed.
--
--  Anonymous votes are counters now, so no ballot rows exist and
--  the index does not need to be partial. This puts back the plain
--  one, which "on conflict" can use.
--
--  Run this in the Supabase SQL editor.
-- ============================================================

-- Any leftovers from the old ballot-row design would block a plain
-- unique index, so clear them first. Their counts were already moved
-- into poll_tallies by fix_anonymous_polls_v2.sql.
delete from public.announcement_reads where action = 'ballot' or unit = '(ballot)';

-- Belt and braces: if a duplicate somehow exists, keep the newest.
delete from public.announcement_reads a
using  public.announcement_reads b
where  a.ann_id = b.ann_id
  and  lower(trim(a.unit)) = lower(trim(b.unit))
  and  a.id < b.id;

drop index if exists uq_announcement_reads;
create unique index uq_announcement_reads
  on public.announcement_reads (ann_id, unit);

-- Confirm it is a normal index again (partial should come back empty)
select indexname, indexdef
from   pg_indexes
where  tablename = 'announcement_reads';
