-- ============================================================
--  Find images in storage that nothing in the app points at.
--
--  Every image reference is stored as "sb:folder/file.jpg", so the
--  part after "sb:" is the object name in the bucket. Anything in
--  the bucket that no table mentions is dead weight.
--
--  STEP 1 lists them. STEP 2 deletes. Run step 1 first and look at
--  what comes back -- deleting a photo is not undoable.
-- ============================================================


-- ---------- STEP 1: what is in there, and what is orphaned ----------

with refs as (
  -- every place the app stores an image reference
  select replace(image, 'sb:', '') as obj from public.tiles            where coalesce(image,'')       <> ''
  union all
  select replace(photo, 'sb:', '')            from public.roster       where coalesce(photo,'')       <> ''
  union all
  select replace(img,   'sb:', '')            from public.cabinets     where coalesce(img,'')         <> ''
  union all
  select replace(image, 'sb:', '')            from public.equipment_items where coalesce(image,'')    <> ''
  union all
  select replace(file,  'sb:', '')            from public.apartments   where coalesce(file,'')        <> ''
),
files as (
  select name,
         coalesce((metadata->>'size')::bigint, 0) as bytes,
         created_at
  from   storage.objects
  where  bucket_id = 'image'
)
select f.name,
       round(f.bytes/1024.0, 1) as kb,
       f.created_at::date as uploaded,
       case when r.obj is null then 'ORPHAN - nothing points at it' else 'in use' end as status
from   files f
left join refs r on r.obj = f.name
order by (r.obj is null) desc, f.bytes desc;


-- ---------- how much is being wasted ----------

with refs as (
  select replace(image, 'sb:', '') as obj from public.tiles            where coalesce(image,'')       <> ''
  union all select replace(photo,'sb:','') from public.roster          where coalesce(photo,'')       <> ''
  union all select replace(img,  'sb:','') from public.cabinets        where coalesce(img,'')         <> ''
  union all select replace(image,'sb:','') from public.equipment_items where coalesce(image,'')       <> ''
  union all select replace(file, 'sb:','') from public.apartments      where coalesce(file,'')        <> ''
)
select count(*) filter (where r.obj is null)                              as orphaned_files,
       round(sum(coalesce((o.metadata->>'size')::bigint,0))
             filter (where r.obj is null)/1048576.0, 2)                   as orphaned_mb,
       count(*)                                                           as total_files,
       round(sum(coalesce((o.metadata->>'size')::bigint,0))/1048576.0, 2) as total_mb
from   storage.objects o
left join refs r on r.obj = o.name
where  o.bucket_id = 'image';


-- ---------- STEP 2: delete them ----------
-- Only run this once you are happy with the list above.
-- Uncomment the block to use it.
--
-- with refs as (
--   select replace(image, 'sb:', '') as obj from public.tiles            where coalesce(image,'')  <> ''
--   union all select replace(photo,'sb:','') from public.roster          where coalesce(photo,'')  <> ''
--   union all select replace(img,  'sb:','') from public.cabinets        where coalesce(img,'')    <> ''
--   union all select replace(image,'sb:','') from public.equipment_items where coalesce(image,'')  <> ''
--   union all select replace(file, 'sb:','') from public.apartments      where coalesce(file,'')   <> ''
-- )
-- delete from storage.objects o
-- where  o.bucket_id = 'image'
--   and  not exists (select 1 from refs r where r.obj = o.name)
--   and  o.created_at < now() - interval '1 day';   -- never touch today's uploads
--
-- The one-day guard matters: an image uploaded a moment ago, before the row
-- pointing at it has been saved, would otherwise look orphaned and be deleted.
