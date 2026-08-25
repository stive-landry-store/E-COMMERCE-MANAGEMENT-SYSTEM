-- Restore self-service seller applications (Sharetribe / Shopify-style marketplace).
-- Sellers can apply, admin approves; approved sellers list products & services.

alter table public.products
  add column if not exists listing_type text not null default 'product'
  check (listing_type in ('product', 'service'));

create index if not exists products_listing_type_idx on public.products (listing_type);
create index if not exists products_seller_id_idx on public.products (seller_id);

-- Restore apply_as_seller (blocked in 010_main_admin_add_seller.sql)
create or replace function public.apply_as_seller(
  p_shop_name text,
  p_bio text default null,
  p_shop_location text default null,
  p_work_area text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  if p_shop_name is null or length(trim(p_shop_name)) < 2 then
    raise exception 'Shop name is required';
  end if;
  if p_shop_location is null or length(trim(p_shop_location)) < 2 then
    raise exception 'Shop location is required';
  end if;
  if p_work_area is null or length(trim(p_work_area)) < 2 then
    raise exception 'Area of work is required';
  end if;

  insert into public.sellers (profile_id, shop_name, bio, shop_location, work_area, status)
  values (auth.uid(), trim(p_shop_name), p_bio, trim(p_shop_location), trim(p_work_area), 'pending')
  on conflict (profile_id) do update
    set shop_name = excluded.shop_name,
        bio = excluded.bio,
        shop_location = excluded.shop_location,
        work_area = excluded.work_area,
        status = case
          when public.sellers.status = 'approved' then public.sellers.status
          else 'pending'
        end
  returning id into v_id;

  perform public.notify_staff(
    'seller',
    'New seller application',
    trim(p_shop_name) || ' · ' || trim(p_shop_location) || ' asked to sell on the store.'
  );
  return v_id;
end;
$$;

-- Auto-create seller row when signup metadata includes shop_name
create or replace function public.maybe_apply_seller()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop text;
  v_bio text;
  v_loc text;
  v_area text;
begin
  select
    nullif(trim(coalesce(raw_user_meta_data->>'shop_name', '')), ''),
    raw_user_meta_data->>'shop_bio',
    nullif(trim(coalesce(raw_user_meta_data->>'shop_location', '')), ''),
    nullif(trim(coalesce(raw_user_meta_data->>'work_area', '')), '')
  into v_shop, v_bio, v_loc, v_area
  from auth.users
  where id = new.id;

  if v_shop is not null and length(v_shop) >= 2 then
    insert into public.sellers (profile_id, shop_name, bio, shop_location, work_area, status)
    values (new.id, v_shop, v_bio, v_loc, v_area, 'pending')
    on conflict (profile_id) do nothing;
    perform public.notify_staff('seller', 'New seller application', v_shop || ' asked to sell on the store.');
  end if;
  return new;
end;
$$;

drop policy if exists "admin insert sellers" on public.sellers;
drop policy if exists "insert own seller apply" on public.sellers;
create policy "insert own seller apply" on public.sellers
for insert with check (profile_id = auth.uid());

grant execute on function public.apply_as_seller(text, text, text, text) to authenticated;
