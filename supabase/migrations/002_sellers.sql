-- Sellers, product ownership, and client reviews.
-- Run in the Supabase SQL editor AFTER 001_initial.sql.

do $$ begin
  create type public.seller_status as enum ('pending', 'approved', 'rejected', 'suspended');
exception when duplicate_object then null;
end $$;

create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  shop_name text not null,
  bio text,
  status public.seller_status not null default 'pending',
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.products
  add column if not exists seller_id uuid references public.sellers (id) on delete set null;

create index if not exists idx_products_seller on public.products (seller_id);

create table if not exists public.seller_reviews (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  remark text,
  created_at timestamptz not null default now(),
  unique (seller_id, profile_id)
);

create index if not exists idx_reviews_seller on public.seller_reviews (seller_id);

alter table public.sellers enable row level security;
alter table public.seller_reviews enable row level security;

create or replace function public.current_seller_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.sellers
  where profile_id = auth.uid() and status = 'approved'
  limit 1;
$$;

create or replace function public.is_approved_seller()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_seller_id() is not null;
$$;

create or replace function public.can_verify_sellers()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'store_owner');
$$;

create or replace function public.owns_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.products p
    where p.id = p_product_id
      and (
        public.is_admin_like()
        or (p.seller_id is not null and p.seller_id = public.current_seller_id())
      )
  );
$$;

create or replace function public.can_write_variant_stock(p_variant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_manage_inventory()
    or public.owns_product((select product_id from public.product_variants where id = p_variant_id));
$$;

create or replace function public.apply_as_seller(p_shop_name text, p_bio text default null)
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

  insert into public.sellers (profile_id, shop_name, bio, status)
  values (auth.uid(), trim(p_shop_name), p_bio, 'pending')
  on conflict (profile_id) do update
    set shop_name = excluded.shop_name,
        bio = excluded.bio,
        status = case
          when public.sellers.status = 'approved' then public.sellers.status
          else 'pending'
        end
  returning id into v_id;

  perform public.notify_staff('seller', 'New seller application', trim(p_shop_name) || ' asked to sell on the store.');
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
begin
  select nullif(trim(coalesce(raw_user_meta_data->>'shop_name', '')), ''),
         raw_user_meta_data->>'shop_bio'
  into v_shop, v_bio
  from auth.users
  where id = new.id;

  if v_shop is not null and length(v_shop) >= 2 then
    insert into public.sellers (profile_id, shop_name, bio, status)
    values (new.id, v_shop, v_bio, 'pending')
    on conflict (profile_id) do nothing;
    perform public.notify_staff('seller', 'New seller application', v_shop || ' asked to sell on the store.');
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_maybe_seller on public.profiles;
create trigger on_profile_maybe_seller
after insert on public.profiles
for each row execute procedure public.maybe_apply_seller();

create or replace function public.set_seller_status(p_seller_id uuid, p_status public.seller_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_verify_sellers() then
    raise exception 'Only an administrator can verify sellers';
  end if;

  update public.sellers
  set
    status = p_status,
    approved_by = case when p_status = 'approved' then auth.uid() else approved_by end,
    approved_at = case when p_status = 'approved' then now() else approved_at end
  where id = p_seller_id;

  if p_status = 'approved' then
    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Seller approved', 'You can now post and manage your products.'
    from public.sellers where id = p_seller_id;
  elsif p_status = 'rejected' then
    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Seller application declined', 'An administrator declined your seller request.'
    from public.sellers where id = p_seller_id;
  elsif p_status = 'suspended' then
    insert into public.notifications (user_id, type, title, message)
    select profile_id, 'seller', 'Seller account suspended', 'Your seller access was suspended by an administrator.'
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
  if p_shop_name is null or length(trim(p_shop_name)) < 2 then
    raise exception 'Shop name is required';
  end if;

  insert into public.sellers (profile_id, shop_name, status, approved_by, approved_at)
  values (p_profile_id, trim(p_shop_name), 'approved', auth.uid(), now())
  on conflict (profile_id) do update
    set shop_name = excluded.shop_name,
        status = 'approved',
        approved_by = auth.uid(),
        approved_at = now()
  returning id into v_id;

  insert into public.notifications (user_id, type, title, message)
  values (p_profile_id, 'seller', 'You are now a seller', 'An administrator approved your shop. You can post products.');

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
  v_profile uuid;
begin
  if not public.can_verify_sellers() then
    raise exception 'Only an administrator can remove sellers';
  end if;

  select profile_id into v_profile from public.sellers where id = p_seller_id;
  delete from public.sellers where id = p_seller_id;

  if v_profile is not null then
    insert into public.notifications (user_id, type, title, message)
    values (v_profile, 'seller', 'Seller access removed', 'An administrator removed your seller account.');
  end if;

  perform public.write_audit('admin_remove_seller', 'sellers', p_seller_id::text, '{}'::jsonb);
end;
$$;

create or replace function public.add_stock(p_variant_id uuid, p_quantity integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_write_variant_stock(p_variant_id) then
    raise exception 'Not authorized to add stock';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  perform public.ensure_inventory(p_variant_id);

  update public.inventory
  set total_stock = total_stock + p_quantity
  where variant_id = p_variant_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (p_variant_id, 'add', p_quantity, coalesce(p_reason, 'Stock added'), auth.uid());

  perform public.write_audit('add_stock', 'inventory', p_variant_id::text, jsonb_build_object('quantity', p_quantity, 'reason', p_reason));
end;
$$;

create or replace function public.remove_stock(p_variant_id uuid, p_quantity integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
begin
  if not public.can_write_variant_stock(p_variant_id) then
    raise exception 'Not authorized to remove stock';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required when removing stock';
  end if;

  perform public.ensure_inventory(p_variant_id);

  select total_stock - reserved_stock into v_available
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if v_available < p_quantity then
    raise exception 'Cannot remove more than available stock (% remaining)', v_available;
  end if;

  update public.inventory
  set total_stock = total_stock - p_quantity
  where variant_id = p_variant_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (p_variant_id, 'remove', p_quantity, p_reason, auth.uid());

  perform public.write_audit('remove_stock', 'inventory', p_variant_id::text, jsonb_build_object('quantity', p_quantity, 'reason', p_reason));
end;
$$;

create or replace function public.adjust_stock(p_variant_id uuid, p_new_total integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.inventory%rowtype;
  v_delta integer;
begin
  if not public.can_write_variant_stock(p_variant_id) then
    raise exception 'Not authorized to adjust stock';
  end if;
  if p_new_total is null or p_new_total < 0 then
    raise exception 'New total cannot be negative';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required for physical count adjustments';
  end if;

  perform public.ensure_inventory(p_variant_id);

  select * into v_row from public.inventory where variant_id = p_variant_id for update;

  if p_new_total < v_row.reserved_stock then
    raise exception 'New total (%) cannot be below reserved stock (%)', p_new_total, v_row.reserved_stock;
  end if;

  v_delta := p_new_total - v_row.total_stock;

  update public.inventory
  set total_stock = p_new_total
  where variant_id = p_variant_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (p_variant_id, 'adjust', v_delta, p_reason, auth.uid());

  perform public.write_audit('adjust_stock', 'inventory', p_variant_id::text, jsonb_build_object('new_total', p_new_total, 'delta', v_delta, 'reason', p_reason));
end;
$$;

drop policy if exists "public products" on public.products;
create policy "public products" on public.products
for select using (
  status = 'active'
  or public.is_staff()
  or seller_id = public.current_seller_id()
);

drop policy if exists "staff write products" on public.products;
drop policy if exists "catalog writers" on public.products;
create policy "catalog writers" on public.products
for all
using (public.is_admin_like() or (seller_id is not null and seller_id = public.current_seller_id()))
with check (public.is_admin_like() or (seller_id is not null and seller_id = public.current_seller_id()));

drop policy if exists "public variants" on public.product_variants;
create policy "public variants" on public.product_variants
for select using (
  status = 'active'
  or public.is_staff()
  or public.owns_product(product_id)
);

drop policy if exists "staff write variants" on public.product_variants;
drop policy if exists "variant writers" on public.product_variants;
create policy "variant writers" on public.product_variants
for all
using (public.owns_product(product_id))
with check (public.owns_product(product_id));

drop policy if exists "staff movements" on public.stock_movements;
create policy "staff movements" on public.stock_movements
for select using (
  public.is_staff()
  or public.owns_product((select product_id from public.product_variants v where v.id = stock_movements.variant_id))
);

drop policy if exists "seller orders" on public.orders;
create policy "seller orders" on public.orders
for select using (
  public.is_approved_seller() and exists (
    select 1
    from public.order_items oi
    join public.product_variants v on v.id = oi.variant_id
    join public.products p on p.id = v.product_id
    where oi.order_id = orders.id
      and p.seller_id = public.current_seller_id()
  )
);

drop policy if exists "seller order items" on public.order_items;
create policy "seller order items" on public.order_items
for select using (
  public.is_approved_seller() and exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = order_items.variant_id
      and p.seller_id = public.current_seller_id()
  )
);

drop policy if exists "seller reservations" on public.reservations;
create policy "seller reservations" on public.reservations
for select using (
  public.is_approved_seller() and exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = reservations.variant_id
      and p.seller_id = public.current_seller_id()
  )
);

drop policy if exists "read sellers" on public.sellers;
create policy "read sellers" on public.sellers
for select using (
  status = 'approved'
  or profile_id = auth.uid()
  or public.can_verify_sellers()
  or public.is_admin_like()
);

drop policy if exists "insert own seller apply" on public.sellers;
create policy "insert own seller apply" on public.sellers
for insert with check (profile_id = auth.uid());

drop policy if exists "admin update sellers" on public.sellers;
create policy "admin update sellers" on public.sellers
for update using (public.can_verify_sellers());

drop policy if exists "admin delete sellers" on public.sellers;
create policy "admin delete sellers" on public.sellers
for delete using (public.can_verify_sellers());

drop policy if exists "read reviews" on public.seller_reviews;
create policy "read reviews" on public.seller_reviews for select using (true);

drop policy if exists "clients write reviews" on public.seller_reviews;
create policy "clients write reviews" on public.seller_reviews
for insert with check (profile_id = auth.uid());

drop policy if exists "clients update own reviews" on public.seller_reviews;
create policy "clients update own reviews" on public.seller_reviews
for update using (profile_id = auth.uid());

drop policy if exists "staff write product images" on storage.objects;
drop policy if exists "catalog images insert" on storage.objects;
create policy "catalog images insert"
on storage.objects for insert
with check (
  bucket_id = 'product-images'
  and (public.current_role() = 'admin' or public.is_approved_seller())
);

drop policy if exists "staff update product images" on storage.objects;
drop policy if exists "catalog images update" on storage.objects;
create policy "catalog images update"
on storage.objects for update
using (
  bucket_id = 'product-images'
  and (public.current_role() = 'admin' or public.is_approved_seller())
);

drop policy if exists "staff delete product images" on storage.objects;
drop policy if exists "catalog images delete" on storage.objects;
create policy "catalog images delete"
on storage.objects for delete
using (
  bucket_id = 'product-images'
  and (public.current_role() = 'admin' or public.is_approved_seller())
);

drop policy if exists "admin brand logos insert" on storage.objects;
create policy "admin brand logos insert"
on storage.objects for insert
with check (bucket_id = 'brand-logos' and public.current_role() = 'admin');

drop policy if exists "admin brand logos update" on storage.objects;
create policy "admin brand logos update"
on storage.objects for update
using (bucket_id = 'brand-logos' and public.current_role() = 'admin');

drop policy if exists "admin brand logos delete" on storage.objects;
create policy "admin brand logos delete"
on storage.objects for delete
using (bucket_id = 'brand-logos' and public.current_role() = 'admin');

grant select, insert, update, delete on public.sellers to authenticated;
grant select on public.sellers to anon;
grant select, insert, update on public.seller_reviews to authenticated;
grant select on public.seller_reviews to anon;

grant execute on function public.apply_as_seller(text, text) to authenticated;
grant execute on function public.set_seller_status(uuid, public.seller_status) to authenticated;
grant execute on function public.admin_add_seller(uuid, text) to authenticated;
grant execute on function public.admin_remove_seller(uuid) to authenticated;
grant execute on function public.current_seller_id() to authenticated;
grant execute on function public.is_approved_seller() to authenticated;
grant execute on function public.owns_product(uuid) to authenticated;
grant execute on function public.can_verify_sellers() to authenticated;
grant execute on function public.can_write_variant_stock(uuid) to authenticated;
