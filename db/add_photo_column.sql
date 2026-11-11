-- Adds the photo column + lets signed-in members upload images.
alter table public.roster add column if not exists photo text;

-- Storage: signed-in members can upload and everyone can view (bucket is public)
drop policy if exists "member upload" on storage.objects;
create policy "member upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'image');

drop policy if exists "member update own uploads" on storage.objects;
create policy "member update own uploads" on storage.objects
  for update to authenticated using (bucket_id = 'image') with check (bucket_id = 'image');

drop policy if exists "public view images" on storage.objects;
create policy "public view images" on storage.objects
  for select to public using (bucket_id = 'image');
