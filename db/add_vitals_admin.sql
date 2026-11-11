-- ============================================================
--  Lets Vitals be edited from the admin portal, and the
--  Rule of 9s diagram be swapped without touching the repo.
--
--  Adds an order column so rows can be dragged, numbers the
--  existing ones in their current order, and creates a setting
--  to hold the diagram.
-- ============================================================

alter table public.vitals add column if not exists order_col text;

with n as (select id, row_number() over (order by id) r from public.vitals)
update public.vitals v set order_col = n.r::text from n
where n.id = v.id and v.order_col is null;

-- Blank means "use the ruleof9.webp file in the repo", which is what
-- happens today. Upload one from the admin portal and this fills in.
insert into public.settings (setting, value)
select 'Rule Of 9 Image', ''
where not exists (select 1 from public.settings where setting = 'Rule Of 9 Image');

select count(*) as vitals_rows, count(order_col) as numbered from public.vitals;
select setting, value from public.settings where setting = 'Rule Of 9 Image';
