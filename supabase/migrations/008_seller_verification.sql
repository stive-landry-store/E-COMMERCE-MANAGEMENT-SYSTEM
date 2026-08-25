-- Separate seller approval (can sell) from blue verification badge.
-- Customers rate 0–5 stars. Auto-verify after 10+ reviews with rating >= 4.
-- Admin can grant or revoke verification at any time.

alter table public.sellers
  add column if not exists is_verified boolean not null default false,
  add column if not exists verified_at timestamptz,
  add column if not exists verified_source text,
  add column if not exists verification_revoked_at timestamptz;

alter table public.sellers
  drop constraint if exists sellers_verified_source_check;
alter table public.sellers
  add constraint sellers_verified_source_check
  check (verified_source is null or verified_source in ('admin', 'auto'));

-- Allow 0–5 stars (0 = very poor, 5 = excellent)
alter table public.seller_reviews drop constraint if exists seller_reviews_rating_check;
alter table public.seller_reviews
  add constraint seller_reviews_rating_check check (rating between 0 and 5);

-- Main store admin profile stays visually verified via role in the app.
-- Existing approved sellers do NOT get the badge automatically.
update public.sellers
set is_verified = false
where is_verified is distinct from true;

create or replace function public.set_seller_verified(p_seller_id uuid, p_verified boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_verify_sellers() then
    raise exception 'Only an administrator can manage seller verification';
  end if;

  if p_verified then
    update public.sellers
    set
      is_verified = true,
      verified_at = now(),
      verified_source = 'admin',
      verification_revoked_at = null
    where id = p_seller_id;

    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Verified badge granted',
      'Your shop now shows the blue verified badge to customers.'
    from public.sellers where id = p_seller_id;
  else
    update public.sellers
    set
      is_verified = false,
      verified_source = null,
      verification_revoked_at = now()
    where id = p_seller_id;

    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Verified badge removed',
      'An administrator removed your verified badge.'
    from public.sellers where id = p_seller_id;
  end if;

  perform public.write_audit(
    'set_seller_verified',
    'sellers',
    p_seller_id::text,
    jsonb_build_object('verified', p_verified)
  );
end;
$$;

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
  if not found then
    return;
  end if;

  -- Only approved sellers can earn the badge
  if v_row.status <> 'approved' then
    return;
  end if;

  -- Already verified
  if v_row.is_verified then
    return;
  end if;

  -- Admin revoked — do not auto-restore until admin grants again
  if v_row.verification_revoked_at is not null then
    return;
  end if;

  select count(*)::integer into v_count
  from public.seller_reviews
  where seller_id = p_seller_id
    and rating >= 4;

  if v_count >= 10 then
    update public.sellers
    set
      is_verified = true,
      verified_at = now(),
      verified_source = 'auto'
    where id = p_seller_id;

    insert into public.notifications (user_id, type, title, message)
    values (
      v_row.profile_id,
      'seller',
      'Verified badge earned',
      'You received 10 or more ratings of 4–5 stars. Your shop is now verified.'
    );
  end if;
end;
$$;

create or replace function public.trg_seller_review_auto_verify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.maybe_auto_verify_seller(coalesce(NEW.seller_id, OLD.seller_id));
  return coalesce(NEW, OLD);
end;
$$;

drop trigger if exists seller_reviews_auto_verify on public.seller_reviews;
create trigger seller_reviews_auto_verify
  after insert or update of rating on public.seller_reviews
  for each row
  execute function public.trg_seller_review_auto_verify();

-- Approving a seller must NOT grant the verified badge
create or replace function public.set_seller_status(p_seller_id uuid, p_status public.seller_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_verify_sellers() then
    raise exception 'Only an administrator can manage sellers';
  end if;

  update public.sellers
  set
    status = p_status,
    approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
    approved_at = case when p_status = 'approved' then now() else approved_at end,
    -- Losing approval also clears the badge
    is_verified = case when p_status = 'approved' then is_verified else false end,
    verified_source = case when p_status = 'approved' then verified_source else null end
  where id = p_seller_id;

  if p_status = 'approved' then
    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Seller approved',
      'You can now post and manage your products. The verified badge is separate and may be granted later.'
    from public.sellers where id = p_seller_id;
  elsif p_status = 'rejected' then
    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Seller application declined',
      'An administrator declined your seller request.'
    from public.sellers where id = p_seller_id;
  elsif p_status = 'suspended' then
    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Seller account suspended',
      'Your seller access was suspended by an administrator.'
    from public.sellers where id = p_seller_id;
  end if;

  perform public.write_audit('set_seller_status', 'sellers', p_seller_id::text, jsonb_build_object('status', p_status));
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
  if not public.can_verify_sellers() then
    raise exception 'Only an administrator can add sellers';
  end if;

  insert into public.sellers (profile_id, shop_name, status, approved_by, approved_at, is_verified)
  values (p_profile_id, trim(p_shop_name), 'approved', auth.uid(), now(), false)
  on conflict (profile_id) do update
    set
      shop_name = excluded.shop_name,
      status = 'approved',
      approved_by = auth.uid(),
      approved_at = now()
      -- keep existing is_verified as-is on conflict
  returning id into v_id;

  insert into public.notifications (user_id, type, title, message)
  values (
    p_profile_id,
    'seller',
    'You are now a seller',
    'An administrator approved your shop. You can post products. Verification badge is separate.'
  );

  perform public.write_audit('admin_add_seller', 'sellers', v_id::text, jsonb_build_object('profile_id', p_profile_id));
  return v_id;
end;
$$;

grant execute on function public.set_seller_verified(uuid, boolean) to authenticated;
grant execute on function public.maybe_auto_verify_seller(uuid) to authenticated;
