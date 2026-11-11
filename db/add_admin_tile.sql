-- Adds the Admin tile back (it lives only in Supabase, not in the Google Sheet,
-- so the data reload removed it).
insert into public.tiles (order_col, label, type, target, admin_only, icon, image, active)
select '99','Admin','admin','','X','','','X'
where not exists (select 1 from public.tiles where lower(trim(type))='admin');

select order_col, label, type, admin_only, active from public.tiles order by (order_col::numeric);
