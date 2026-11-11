-- ============================================================
--  Lets admins remove images from the "image" bucket.
--
--  The bucket has policies for reading and uploading, but never
--  had one for deleting -- which is why replaced tile icons and
--  old member photos have been piling up with no way to clear
--  them. Supabase also blocks deleting storage rows directly in
--  SQL, so this has to go through the Storage API, which is what
--  the app now does.
--
--  Run once.
-- ============================================================

drop policy if exists "image delete" on storage.objects;
create policy "image delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'image' and public.is_admin());

-- Replacing a file also needs update rights, so a re-upload to the
-- same name overwrites rather than failing.
drop policy if exists "image update" on storage.objects;
create policy "image update" on storage.objects
  for update to authenticated
  using (bucket_id = 'image' and public.is_admin())
  with check (bucket_id = 'image' and public.is_admin());

select policyname, cmd
from   pg_policies
where  schemaname = 'storage' and tablename = 'objects'
order  by policyname;
