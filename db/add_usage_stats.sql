-- ============================================================
--  Lets the admin portal show how much space is used.
--  Reports the database size and the size of uploaded files.
--  Admins only.
-- ============================================================
create or replace function public.usage_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  db_bytes bigint;
  file_bytes bigint;
  file_count bigint;
begin
  if not public.is_admin() then
    return json_build_object('ok', false, 'error', 'Admins only');
  end if;

  select pg_database_size(current_database()) into db_bytes;

  begin
    select coalesce(sum((metadata->>'size')::bigint),0), count(*)
      into file_bytes, file_count
      from storage.objects;
  exception when others then
    file_bytes := 0; file_count := 0;
  end;

  return json_build_object(
    'ok', true,
    'db_bytes', coalesce(db_bytes,0),
    'file_bytes', coalesce(file_bytes,0),
    'file_count', coalesce(file_count,0)
  );
end;
$$;

revoke all on function public.usage_stats() from public;
grant execute on function public.usage_stats() to authenticated;
