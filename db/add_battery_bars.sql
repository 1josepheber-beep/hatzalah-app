-- 1.19.0 — battery check on a jump bag item (the AED and its battery).
-- Items ticked "Battery bars" ask the member how many bars the battery showed
-- and when they last checked it, on top of the expiration date.
alter table public.jumpbag_items  add column if not exists bars text default '';   -- X = ask for battery bars
alter table public.jumpbag_status add column if not exists bars smallint;          -- 1..4, null = never checked
alter table public.jumpbag_status add column if not exists bars_at date;           -- the day of that check

-- the AED and its battery is the one item that carries this today
update public.jumpbag_items set bars = 'X' where lower(trim(name)) = 'aed w/ battery';

select id, name, pouch, expires, bars from public.jumpbag_items where bars = 'X';
