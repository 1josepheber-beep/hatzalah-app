-- ============================================================
--  Deletes images nothing points at. Ready to run as-is.
--
--  Run the SELECT at the top first -- it shows exactly what is
--  about to go. If that list looks right, run the DELETE below it.
--
--  Files uploaded in the last day are left alone. An image lands
--  in storage before the row pointing at it is saved, so for a
--  short while a perfectly good upload looks orphaned.
-- ============================================================

-- ---------- what will be deleted ----------
with refs as (
  select replace(image, 'sb:', '') as obj from public.tiles            where coalesce(image,'') <> ''
  union all select replace(photo,'sb:','') from public.roster          where coalesce(photo,'') <> ''
  union all select replace(img,  'sb:','') from public.cabinets        where coalesce(img,'')   <> ''
  union all select replace(image,'sb:','') from public.equipment_items where coalesce(image,'') <> ''
  union all select replace(file, 'sb:','') from public.apartments      where coalesce(file,'')  <> ''
)
select o.name,
       round(coalesce((o.metadata->>'size')::bigint,0)/1024.0,1) as kb,
       o.created_at::date as uploaded
from   storage.objects o
where  o.bucket_id = 'image'
  and  not exists (select 1 from refs r where r.obj = o.name)
  and  o.created_at < now() - interval '1 day'
order  by kb desc;


-- ---------- delete them ----------
with refs as (
  select replace(image, 'sb:', '') as obj from public.tiles            where coalesce(image,'') <> ''
  union all select replace(photo,'sb:','') from public.roster          where coalesce(photo,'') <> ''
  union all select replace(img,  'sb:','') from public.cabinets        where coalesce(img,'')   <> ''
  union all select replace(image,'sb:','') from public.equipment_items where coalesce(image,'') <> ''
  union all select replace(file, 'sb:','') from public.apartments      where coalesce(file,'')  <> ''
)
delete from storage.objects o
where  o.bucket_id = 'image'
  and  not exists (select 1 from refs r where r.obj = o.name)
  and  o.created_at < now() - interval '1 day';


-- ---------- what is left ----------
select count(*) as files_remaining,
       round(sum(coalesce((metadata->>'size')::bigint,0))/1048576.0,2) as mb_remaining
from   storage.objects where bucket_id = 'image';


-- ============================================================
--  If the first query returned NOTHING but you can see old
--  images in the bucket, the stored path and the real filename
--  are not lining up. Run this to compare them, and send me the
--  output -- do not run the delete.
-- ============================================================
-- select 'in the bucket' as src, name from storage.objects where bucket_id='image'
-- union all
-- select 'tiles points at', image from public.tiles where coalesce(image,'') <> ''
-- order by 1, 2;
