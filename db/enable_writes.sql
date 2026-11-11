-- TEMPORARY write access for testing the Supabase build.
-- This will be REPLACED with proper locked-down rules before the live app ever uses Supabase.
grant insert, update, delete on all tables in schema public to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname='public' loop
    execute format('drop policy if exists "test insert" on public.%I', t);
    execute format('create policy "test insert" on public.%I for insert to anon, authenticated with check (true)', t);
    execute format('drop policy if exists "test update" on public.%I', t);
    execute format('create policy "test update" on public.%I for update to anon, authenticated using (true) with check (true)', t);
    execute format('drop policy if exists "test delete" on public.%I', t);
    execute format('create policy "test delete" on public.%I for delete to anon, authenticated using (true)', t);
  end loop;
end $$;
