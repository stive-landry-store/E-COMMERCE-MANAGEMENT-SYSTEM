-- Country on profiles; shop location + work area on sellers

alter table public.profiles
  add column if not exists country text;

alter table public.sellers
  add column if not exists shop_location text,
  add column if not exists work_area text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, country, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''),
    'customer',
    'active'
  );
  insert into public.customers (profile_id, country)
  values (
    new.id,
    coalesce(nullif(trim(coalesce(new.raw_user_meta_data->>'country', '')), ''), 'Cameroon')
  );
  return new;
end;
$$;

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

-- Keep old 2-arg signature working by wrapping (Postgres allows overload)
-- Drop old signature if present so only the 4-arg version remains as primary
drop function if exists public.apply_as_seller(text, text);

grant execute on function public.apply_as_seller(text, text, text, text) to authenticated;

create or replace function public.update_my_seller_place(p_shop_location text, p_work_area text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  if p_shop_location is null or length(trim(p_shop_location)) < 2 then
    raise exception 'Shop location is required';
  end if;
  if p_work_area is null or length(trim(p_work_area)) < 2 then
    raise exception 'Area of work is required';
  end if;

  update public.sellers
  set
    shop_location = trim(p_shop_location),
    work_area = trim(p_work_area)
  where profile_id = auth.uid();

  if not found then
    raise exception 'No seller profile found';
  end if;
end;
$$;

grant execute on function public.update_my_seller_place(text, text) to authenticated;
