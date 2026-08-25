-- Reliable console access flags for co-admin (used by frontend AuthContext)

create or replace function public.get_my_console_access()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'role', public.current_role()::text,
    'is_main_admin', public.is_main_admin(),
    'is_principal_admin', public.is_principal_admin(),
    'is_co_admin', public.current_role() = 'co_admin',
    'can_access_console', public.is_principal_admin() or public.is_staff()
  );
$$;

grant execute on function public.get_my_console_access() to authenticated;
