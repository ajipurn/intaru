-- Supabase's automatic RLS helper runs as a PostgreSQL event trigger.
-- It does not need to be callable by browser roles through the public API.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
