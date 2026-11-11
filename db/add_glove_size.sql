-- ============================================================
--  GLOVE SIZE
--  1) adds the column the app (1.3.2) reads and writes
--  2) fills in the answers from the glove-size poll (first batch:
--     the names visible in the screenshot; the entries hidden
--     behind "See all" are not in here yet)
--
--  Names are matched on the start of the last name and the start
--  of the first name, so nicknames and spelling differences
--  (Mendy/Mendel, Yossi/Yosef, Rosenzwieg/Rosenzweig) still match.
--  The two checks at the end show who was set and which poll
--  names found nobody.
--
--  Run once in Supabase: SQL Editor -> New query -> paste -> Run.
-- ============================================================

alter table public.roster add column if not exists glove_size text default '';

-- ---------- the poll answers (Medium = M, Large = L, X-Large = XL) ----------
with sizes(last_pat, first_pat, size) as (values
  ('fried',   'jos', 'M'),
  ('rosenz',  'yos', 'M'),
  ('marino',  'shm', 'M'),
  ('traxler', 'men', 'M'),
  ('wolbe',   'ary', 'M'),
  ('wohlb',   'd',   'L'),
  ('goldb',   'yos', 'L'),
  ('litvin',  'eli', 'L'),
  ('klein',   'mos', 'L'),
  ('nathan',  'jon', 'XL')
)
update public.roster r
   set glove_size = s.size
  from sizes s
 where lower(trim(r.last_name))  like s.last_pat  || '%'
   and lower(trim(r.first_name)) like s.first_pat || '%';

-- "You" in the poll = H-24
update public.roster set glove_size = 'L' where upper(replace(unit, ' ', '')) = 'H-24';

-- ---------- check 1: everyone who now has a glove size ----------
select unit, first_name, last_name, glove_size
  from public.roster
 where coalesce(glove_size, '') <> ''
 order by last_name, first_name;

-- ---------- check 2: poll names that matched nobody (should come back empty) ----------
with sizes(last_pat, first_pat, size) as (values
  ('fried',   'jos', 'M'),
  ('rosenz',  'yos', 'M'),
  ('marino',  'shm', 'M'),
  ('traxler', 'men', 'M'),
  ('wolbe',   'ary', 'M'),
  ('wohlb',   'd',   'L'),
  ('goldb',   'yos', 'L'),
  ('litvin',  'eli', 'L'),
  ('klein',   'mos', 'L'),
  ('nathan',  'jon', 'XL')
)
select s.last_pat as last_name_starts_with, s.first_pat as first_name_starts_with, s.size
  from sizes s
 where not exists (
   select 1 from public.roster r
    where lower(trim(r.last_name))  like s.last_pat  || '%'
      and lower(trim(r.first_name)) like s.first_pat || '%');
