-- Co-admin: staff access, seller listing RPC, shared console privileges (not payments / co-admin nomination).

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in (
    'sales_staff',
    'inventory_manager',
    'admin',
    'co_admin',
    'store_owner',
    'it_support'
  );
$$;

create or replace function public.is_admin_like()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'co_admin', 'it_support');
$$;

create or replace function public.can_manage_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('inventory_manager', 'admin', 'co_admin');
$$;

create or replace function public.can_manage_orders()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('sales_staff', 'admin', 'co_admin', 'store_owner');
$$;

create or replace function public.can_verify_sellers()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_principal_admin();
$$;

-- Reliable seller list for admin console (includes pending applications)
create or replace function public.admin_list_sellers()
returns table (
  id uuid,
  profile_id uuid,
  shop_name text,
  bio text,
  shop_location text,
  work_area text,
  status public.seller_status,
  is_verified boolean,
  verified_at timestamptz,
  verified_source text,
  verification_revoked_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz,
  owner_full_name text,
  owner_email text,
  owner_phone text,
  owner_country text,
  owner_role public.user_role,
  owner_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id,
    s.profile_id,
    s.shop_name,
    s.bio,
    s.shop_location,
    s.work_area,
    s.status,
    coalesce(s.is_verified, false),
    s.verified_at,
    s.verified_source::text,
    s.verification_revoked_at,
    s.approved_by,
    s.approved_at,
    s.created_at,
    p.full_name,
    p.email,
    p.phone,
    p.country,
    p.role,
    p.avatar_url
  from public.sellers s
  join public.profiles p on p.id = s.profile_id
  where public.can_verify_sellers()
  order by
    case s.status when 'pending' then 0 else 1 end,
    s.shop_name;
$$;

drop policy if exists "read sellers" on public.sellers;
create policy "read sellers" on public.sellers
for select using (
  status = 'approved'
  or profile_id = auth.uid()
  or public.can_verify_sellers()
);

drop policy if exists "admin update sellers" on public.sellers;
create policy "admin update sellers" on public.sellers
for update using (public.can_verify_sellers());

drop policy if exists "admin delete sellers" on public.sellers;
create policy "admin delete sellers" on public.sellers
for delete using (public.is_main_admin());

grant execute on function public.admin_list_sellers() to authenticated;
