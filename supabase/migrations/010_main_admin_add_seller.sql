-- Only the main administrator (profiles.role = 'admin') can add / manage sellers.
-- store_owner and self-service applications are no longer allowed to create sellers.

create or replace function public.can_verify_sellers()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
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
begin
  raise exception 'Only the main administrator can add sellers';
end;
$$;

-- Stop auto-creating seller rows from signup metadata
create or replace function public.maybe_apply_seller()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  return new;
end;
$$;

create or replace function public.admin_add_seller(p_profile_id uuid, p_shop_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if public.current_role() <> 'admin' then
    raise exception 'Only the main administrator can add sellers';
  end if;
  if p_shop_name is null or length(trim(p_shop_name)) < 2 then
    raise exception 'Shop name is required';
  end if;

  insert into public.sellers (profile_id, shop_name, status, approved_by, approved_at, is_verified)
  values (p_profile_id, trim(p_shop_name), 'approved', auth.uid(), now(), false)
  on conflict (profile_id) do update
    set
      shop_name = excluded.shop_name,
      status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
  returning id into v_id;

  insert into public.notifications (user_id, type, title, message)
  values (
    p_profile_id,
    'seller',
    'You are now a seller',
    'The main administrator approved your shop. You can post products. Verification badge is separate.'
  );

  perform public.write_audit('admin_add_seller', 'sellers', v_id::text, jsonb_build_object('profile_id', p_profile_id));
  return v_id;
end;
$$;

-- Block direct inserts by non-admins (RPCs are security definer)
drop policy if exists "insert own seller apply" on public.sellers;
create policy "admin insert sellers" on public.sellers
for insert with check (public.current_role() = 'admin');

grant execute on function public.apply_as_seller(text, text, text, text) to authenticated;
grant execute on function public.admin_add_seller(uuid, text) to authenticated;
grant execute on function public.can_verify_sellers() to authenticated;
