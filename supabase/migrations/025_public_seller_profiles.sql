-- Public seller profiles (avatar + shop) + seller_id in chat peers

create or replace function public.get_public_seller_profile(p_seller_id uuid)
returns table (
  id uuid,
  profile_id uuid,
  shop_name text,
  bio text,
  shop_location text,
  work_area text,
  status text,
  is_verified boolean,
  created_at timestamptz,
  full_name text,
  avatar_url text
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
    s.status::text,
    coalesce(s.is_verified, false),
    s.created_at,
    p.full_name,
    p.avatar_url
  from public.sellers s
  left join public.profiles p on p.id = s.profile_id
  where s.id = p_seller_id
    and s.status = 'approved';
$$;

create or replace function public.list_public_sellers(p_limit int default 24)
returns table (
  id uuid,
  profile_id uuid,
  shop_name text,
  bio text,
  shop_location text,
  work_area text,
  is_verified boolean,
  created_at timestamptz,
  full_name text,
  avatar_url text,
  listing_count bigint
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
    coalesce(s.is_verified, false),
    s.created_at,
    p.full_name,
    p.avatar_url,
    (
      select count(*)::bigint
      from public.products pr
      where pr.seller_id = s.id
        and pr.status = 'active'
    ) as listing_count
  from public.sellers s
  left join public.profiles p on p.id = s.profile_id
  where s.status = 'approved'
  order by s.shop_name
  limit greatest(coalesce(p_limit, 24), 1);
$$;

-- Must DROP first: return type changed (added seller_id)
drop function if exists public.list_seller_chat_peers();

create function public.list_seller_chat_peers()
returns table (
  seller_id uuid,
  profile_id uuid,
  shop_name text,
  full_name text,
  email text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as seller_id,
    s.profile_id,
    s.shop_name,
    p.full_name,
    p.email,
    p.avatar_url
  from public.sellers s
  join public.profiles p on p.id = s.profile_id
  where s.status = 'approved'
    and s.profile_id is distinct from auth.uid()
    and public.can_use_seller_chat()
  order by s.shop_name;
$$;

grant execute on function public.get_public_seller_profile(uuid) to anon, authenticated;
grant execute on function public.list_public_sellers(int) to anon, authenticated;
grant execute on function public.list_seller_chat_peers() to authenticated;
