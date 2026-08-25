-- Step 2 of 2: co-admin functions, avatars, auto-verify (9+ ratings).
-- Prerequisite: 016_co_admin_enum.sql must be run and committed first.

alter table public.profiles
  add column if not exists avatar_url text;

create or replace function public.is_main_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'admin';
$$;

create or replace function public.is_principal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'co_admin');
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

-- Main admin only: manual add/remove sellers, nominate co-admin
create or replace function public.admin_add_seller(p_profile_id uuid, p_shop_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_main_admin() then
    raise exception 'Only the main administrator can add sellers manually';
  end if;
  if p_shop_name is null or length(trim(p_shop_name)) < 2 then
    raise exception 'Shop name is required';
  end if;

  insert into public.sellers (profile_id, shop_name, status, approved_by, approved_at, is_verified)
  values (p_profile_id, trim(p_shop_name), 'approved', auth.uid(), now(), false)
  on conflict (profile_id) do update
    set shop_name = excluded.shop_name,
        status = 'approved',
        approved_by = auth.uid(),
        approved_at = now()
  returning id into v_id;

  insert into public.notifications (user_id, type, title, message)
  values (p_profile_id, 'seller', 'You are now a seller', 'An administrator approved your shop. Verification badge is separate.');

  perform public.write_audit('admin_add_seller', 'sellers', v_id::text, jsonb_build_object('profile_id', p_profile_id));
  return v_id;
end;
$$;

create or replace function public.admin_remove_seller(p_seller_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
begin
  if not public.is_main_admin() then
    raise exception 'Only the main administrator can remove sellers';
  end if;
  select profile_id into v_profile_id from public.sellers where id = p_seller_id;
  if not found then
    raise exception 'Seller not found';
  end if;

  update public.products set seller_id = null where seller_id = p_seller_id;
  delete from public.sellers where id = p_seller_id;

  update public.profiles set role = 'customer' where id = v_profile_id and role = 'co_admin';

  perform public.write_audit('admin_remove_seller', 'sellers', p_seller_id::text, '{}'::jsonb);
end;
$$;

-- Nominate / revoke co-admin (verified approved seller only)
create or replace function public.set_co_admin(p_seller_id uuid, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.sellers%rowtype;
begin
  if not public.is_main_admin() then
    raise exception 'Only the main administrator can manage co-admins';
  end if;

  select * into v_row from public.sellers where id = p_seller_id;
  if not found then
    raise exception 'Seller not found';
  end if;

  if p_enabled then
    if v_row.status <> 'approved' then
      raise exception 'Seller must be approved first';
    end if;
    if not coalesce(v_row.is_verified, false) then
      raise exception 'Seller must be verified before becoming co-admin';
    end if;

    update public.profiles set role = 'co_admin' where id = v_row.profile_id;

    insert into public.notifications (user_id, type, title, message)
    values (
      v_row.profile_id,
      'seller',
      'Co-admin access granted',
      'You can now approve sellers and manage verification. Payment settings remain with the main admin.'
    );
  else
    update public.profiles set role = 'customer' where id = v_row.profile_id and role = 'co_admin';

    insert into public.notifications (user_id, type, title, message)
    values (
      v_row.profile_id,
      'seller',
      'Co-admin access removed',
      'Your co-admin privileges were removed. You can still sell as a verified vendor.'
    );
  end if;

  perform public.write_audit(
    'set_co_admin',
    'sellers',
    p_seller_id::text,
    jsonb_build_object('enabled', p_enabled, 'profile_id', v_row.profile_id)
  );
end;
$$;

-- Auto-verify: 9+ reviews with rating >= 4
create or replace function public.maybe_auto_verify_seller(p_seller_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_row public.sellers%rowtype;
begin
  select * into v_row from public.sellers where id = p_seller_id;
  if not found or v_row.status <> 'approved' or v_row.is_verified then
    return;
  end if;
  if v_row.verification_revoked_at is not null then
    return;
  end if;

  select count(*)::integer into v_count
  from public.seller_reviews
  where seller_id = p_seller_id and rating >= 4;

  if v_count >= 9 then
    update public.sellers
    set is_verified = true, verified_at = now(), verified_source = 'auto'
    where id = p_seller_id;

    insert into public.notifications (user_id, type, title, message)
    values (
      v_row.profile_id,
      'seller',
      'Verified badge earned',
      'You received 9 or more ratings of 4–5 stars. Your shop is now verified.'
    );
  end if;
end;
$$;

-- Avatar storage
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar"
on storage.objects for insert
with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar"
on storage.objects for update
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar"
on storage.objects for delete
using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

grant execute on function public.is_main_admin() to authenticated;
grant execute on function public.is_principal_admin() to authenticated;
grant execute on function public.set_co_admin(uuid, boolean) to authenticated;
