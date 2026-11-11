-- ============================================================
--  Makes drag-to-reorder work on Apartments, Hospitals,
--  Task List and Upload Types.
--
--  All four are draggable in the admin panel but had no column
--  to store the order in, so the new order was lost on reload.
--  Worse, the app tried to write one anyway, which made the whole
--  save fail -- that is why renaming an apartment did nothing.
--
--  Existing rows are numbered in their current order, so nothing
--  jumps around the first time.
-- ============================================================

alter table public.apartments add column if not exists order_col text;
alter table public.hospitals  add column if not exists order_col text;
alter table public.task_list  add column if not exists order_col text;
alter table public.uploads    add column if not exists order_col text;

-- number them as they stand today
with n as (select id, row_number() over (order by id) r from public.apartments)
update public.apartments a set order_col = n.r::text from n where n.id = a.id and a.order_col is null;

with n as (select id, row_number() over (order by id) r from public.hospitals)
update public.hospitals h set order_col = n.r::text from n where n.id = h.id and h.order_col is null;

with n as (select id, row_number() over (order by id) r from public.task_list)
update public.task_list t set order_col = n.r::text from n where n.id = t.id and t.order_col is null;

with n as (select id, row_number() over (order by id) r from public.uploads)
update public.uploads u set order_col = n.r::text from n where n.id = u.id and u.order_col is null;

select 'apartments' t, count(*) rows, count(order_col) numbered from public.apartments
union all select 'hospitals', count(*), count(order_col) from public.hospitals
union all select 'task_list', count(*), count(order_col) from public.task_list
union all select 'uploads',   count(*), count(order_col) from public.uploads;
