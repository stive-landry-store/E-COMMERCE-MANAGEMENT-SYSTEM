-- ECMS initial schema, RLS, RPCs, storage, and triggers
-- Run in the Supabase SQL editor (or via CLI) on a fresh project.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum (
  'customer',
  'sales_staff',
  'inventory_manager',
  'admin',
  'store_owner',
  'it_support'
);

create type public.user_status as enum ('active', 'inactive');
create type public.product_status as enum ('active', 'inactive', 'archived');
create type public.record_status as enum ('active', 'inactive');

create type public.stock_movement_type as enum (
  'add',
  'remove',
  'adjust',
  'sale',
  'reservation_hold',
  'reservation_release',
  'preorder_fulfill',
  'return'
);

create type public.order_status as enum (
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'completed',
  'cancelled'
);

create type public.payment_status as enum (
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded'
);

create type public.fulfillment_method as enum ('pickup', 'delivery');
create type public.payment_method as enum ('pay_at_store', 'card');

create type public.reservation_status as enum (
  'active',
  'converted',
  'expired',
  'cancelled'
);

create type public.preorder_status as enum (
  'pending',
  'confirmed',
  'fulfilled',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text unique,
  full_name text not null default '',
  phone text,
  role public.user_role not null default 'customer',
  status public.user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  address_line text,
  city text,
  country text default 'Cameroon',
  notes text,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  slug text not null unique,
  brand_id uuid references public.brands (id) on delete set null,
  category_id uuid references public.categories (id) on delete set null,
  description text,
  specs jsonb not null default '{}'::jsonb,
  base_price numeric(12, 2) not null default 0,
  featured boolean not null default false,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  model text,
  storage text,
  color text,
  sku text not null unique,
  price numeric(12, 2) not null,
  image_urls text[] not null default '{}',
  reservable boolean not null default true,
  preorder_enabled boolean not null default true,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references public.product_variants (id) on delete cascade,
  total_stock integer not null default 0 check (total_stock >= 0),
  reserved_stock integer not null default 0 check (reserved_stock >= 0),
  min_stock integer not null default 2 check (min_stock >= 0),
  updated_at timestamptz not null default now(),
  constraint reserved_not_over_total check (reserved_stock <= total_stock)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  type public.stock_movement_type not null,
  quantity integer not null,
  reason text,
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  updated_at timestamptz not null default now()
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unique (cart_id, variant_id)
);

create sequence public.order_number_seq start 1;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid not null references public.customers (id),
  profile_id uuid not null references public.profiles (id),
  subtotal numeric(12, 2) not null default 0,
  total numeric(12, 2) not null default 0,
  order_status public.order_status not null default 'pending',
  payment_status public.payment_status not null default 'unpaid',
  fulfillment public.fulfillment_method not null default 'pickup',
  payment_method public.payment_method not null default 'pay_at_store',
  shipping_address jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  product_name text not null,
  variant_label text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  provider text,
  provider_ref text,
  amount numeric(12, 2) not null,
  status public.payment_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  profile_id uuid not null references public.profiles (id),
  variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity > 0),
  status public.reservation_status not null default 'active',
  expires_at timestamptz not null,
  notes text,
  created_at timestamptz not null default now()
);

create table public.preorders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id),
  profile_id uuid not null references public.profiles (id),
  variant_id uuid not null references public.product_variants (id),
  quantity integer not null check (quantity > 0),
  status public.preorder_status not null default 'pending',
  expected_availability date,
  notes text,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  module text not null,
  record_ref text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'Stive Landry Store',
  tagline text not null default 'iPhone & Electronics',
  phone text,
  email text,
  address text,
  hours text,
  reservation_hold_hours integer not null default 48,
  low_stock_default integer not null default 2,
  whatsapp text,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1);

-- ---------------------------------------------------------------------------
-- Views / generated availability
-- ---------------------------------------------------------------------------
create or replace view public.variant_availability
with (security_invoker = true) as
select
  v.id as variant_id,
  v.product_id,
  coalesce(i.total_stock, 0) as total_stock,
  coalesce(i.reserved_stock, 0) as reserved_stock,
  greatest(coalesce(i.total_stock, 0) - coalesce(i.reserved_stock, 0), 0) as available_stock,
  coalesce(i.min_stock, 2) as min_stock,
  case
    when greatest(coalesce(i.total_stock, 0) - coalesce(i.reserved_stock, 0), 0) <= 0 then
      case when v.preorder_enabled then 'preorder' else 'out_of_stock' end
    when greatest(coalesce(i.total_stock, 0) - coalesce(i.reserved_stock, 0), 0) <= coalesce(i.min_stock, 2) then 'low_stock'
    else 'in_stock'
  end as availability
from public.product_variants v
left join public.inventory i on i.variant_id = v.id;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index idx_products_status on public.products (status);
create index idx_products_category on public.products (category_id);
create index idx_products_brand on public.products (brand_id);
create index idx_variants_product on public.product_variants (product_id);
create index idx_orders_profile on public.orders (profile_id);
create index idx_orders_status on public.orders (order_status);
create index idx_reservations_status on public.reservations (status);
create index idx_notifications_user on public.notifications (user_id, created_at desc);
create index idx_stock_movements_variant on public.stock_movements (variant_id, created_at desc);
create index idx_audit_created on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
for each row execute procedure public.set_updated_at();
create trigger trg_products_updated before update on public.products
for each row execute procedure public.set_updated_at();
create trigger trg_orders_updated before update on public.orders
for each row execute procedure public.set_updated_at();
create trigger trg_inventory_updated before update on public.inventory
for each row execute procedure public.set_updated_at();

create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

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
  select public.current_role() in ('admin', 'it_support');
$$;

create or replace function public.can_manage_inventory()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('inventory_manager', 'admin');
$$;

create or replace function public.can_manage_orders()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('sales_staff', 'admin', 'store_owner');
$$;

create or replace function public.write_audit(
  p_action text,
  p_module text,
  p_record_ref text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, module, record_ref, metadata)
  values (auth.uid(), p_action, p_module, p_record_ref, coalesce(p_metadata, '{}'::jsonb));
end;
$$;

create or replace function public.notify_staff(
  p_type text,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message)
  select id, p_type, p_title, p_message
  from public.profiles
  where role in ('admin', 'inventory_manager', 'sales_staff', 'store_owner')
    and status = 'active';
end;
$$;

create or replace function public.ensure_inventory(p_variant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.inventory (variant_id)
  values (p_variant_id)
  on conflict (variant_id) do nothing;
end;
$$;

create or replace function public.handle_new_variant()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_inventory(new.id);
  return new;
end;
$$;

create trigger trg_variant_inventory
after insert on public.product_variants
for each row execute procedure public.handle_new_variant();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    'customer',
    'active'
  );
  insert into public.customers (profile_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Inventory RPCs
-- ---------------------------------------------------------------------------
create or replace function public.add_stock(p_variant_id uuid, p_quantity integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.can_manage_inventory() then
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
  if not public.can_manage_inventory() then
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
  if not public.can_manage_inventory() then
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

-- ---------------------------------------------------------------------------
-- Cart / checkout
-- ---------------------------------------------------------------------------
create or replace function public.get_or_create_cart()
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
  select id into v_id from public.carts where profile_id = auth.uid();
  if v_id is null then
    insert into public.carts (profile_id) values (auth.uid()) returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.place_order(
  p_fulfillment public.fulfillment_method,
  p_payment_method public.payment_method,
  p_address jsonb default null,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
  v_customer_id uuid;
  v_order_id uuid;
  v_item record;
  v_available integer;
  v_subtotal numeric(12, 2) := 0;
  v_order_number text;
  v_payment_status public.payment_status := 'unpaid';
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  select id into v_customer_id from public.customers where profile_id = auth.uid();
  if v_customer_id is null then
    insert into public.customers (profile_id) values (auth.uid()) returning id into v_customer_id;
  end if;

  v_cart_id := public.get_or_create_cart();

  if not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'Your cart is empty';
  end if;

  if p_payment_method = 'card' then
    v_payment_status := 'pending';
  end if;

  v_order_number := 'ECMS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0');

  insert into public.orders (
    order_number, customer_id, profile_id, order_status, payment_status,
    fulfillment, payment_method, shipping_address, notes
  ) values (
    v_order_number, v_customer_id, auth.uid(), 'pending', v_payment_status,
    p_fulfillment, p_payment_method, p_address, p_notes
  ) returning id into v_order_id;

  for v_item in
    select ci.variant_id, ci.quantity, v.price, v.sku, v.storage, v.color, p.name as product_name
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.cart_id = v_cart_id
  loop
    perform public.ensure_inventory(v_item.variant_id);

    select total_stock - reserved_stock into v_available
    from public.inventory
    where variant_id = v_item.variant_id
    for update;

    if v_available < v_item.quantity then
      raise exception 'Insufficient stock for %', v_item.product_name;
    end if;

    update public.inventory
    set total_stock = total_stock - v_item.quantity
    where variant_id = v_item.variant_id;

    insert into public.order_items (order_id, variant_id, product_name, variant_label, quantity, unit_price)
    values (
      v_order_id,
      v_item.variant_id,
      v_item.product_name,
      trim(both ' ' from concat_ws(' · ', v_item.storage, v_item.color)),
      v_item.quantity,
      v_item.price
    );

    insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
    values (v_item.variant_id, 'sale', v_item.quantity, 'Order ' || v_order_number, auth.uid());

    v_subtotal := v_subtotal + (v_item.price * v_item.quantity);
  end loop;

  update public.orders
  set subtotal = v_subtotal, total = v_subtotal
  where id = v_order_id;

  insert into public.payments (order_id, provider, amount, status)
  values (
    v_order_id,
    case when p_payment_method = 'card' then 'card' else 'pay_at_store' end,
    v_subtotal,
    v_payment_status
  );

  delete from public.cart_items where cart_id = v_cart_id;

  insert into public.notifications (user_id, type, title, message)
  values (auth.uid(), 'order', 'Order placed', 'Your order ' || v_order_number || ' has been received.');

  perform public.notify_staff('order', 'New order', 'Order ' || v_order_number || ' was placed.');
  perform public.write_audit('place_order', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number, 'total', v_subtotal));

  return v_order_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reservations & pre-orders
-- ---------------------------------------------------------------------------
create or replace function public.create_reservation(p_variant_id uuid, p_quantity integer default 1)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_available integer;
  v_reservable boolean;
  v_hours integer;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select reservable into v_reservable from public.product_variants where id = p_variant_id;
  if coalesce(v_reservable, false) = false then
    raise exception 'This product cannot be reserved';
  end if;

  select id into v_customer_id from public.customers where profile_id = auth.uid();
  if v_customer_id is null then
    insert into public.customers (profile_id) values (auth.uid()) returning id into v_customer_id;
  end if;

  perform public.ensure_inventory(p_variant_id);

  select total_stock - reserved_stock into v_available
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if v_available < p_quantity then
    raise exception 'Not enough stock to reserve';
  end if;

  update public.inventory
  set reserved_stock = reserved_stock + p_quantity
  where variant_id = p_variant_id;

  select reservation_hold_hours into v_hours from public.site_settings where id = 1;

  insert into public.reservations (customer_id, profile_id, variant_id, quantity, expires_at)
  values (v_customer_id, auth.uid(), p_variant_id, p_quantity, now() + make_interval(hours => coalesce(v_hours, 48)))
  returning id into v_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (p_variant_id, 'reservation_hold', p_quantity, 'Customer reservation', auth.uid());

  insert into public.notifications (user_id, type, title, message)
  values (auth.uid(), 'reservation', 'Reservation confirmed', 'Your hold is active until it expires or you convert it to an order.');

  perform public.notify_staff('reservation', 'New reservation', 'A customer reserved stock.');
  perform public.write_audit('create_reservation', 'reservations', v_id::text, jsonb_build_object('variant_id', p_variant_id, 'quantity', p_quantity));

  return v_id;
end;
$$;

create or replace function public.cancel_reservation(p_reservation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.reservations%rowtype;
begin
  select * into v_row from public.reservations where id = p_reservation_id for update;
  if v_row.id is null then
    raise exception 'Reservation not found';
  end if;
  if v_row.status <> 'active' then
    raise exception 'Reservation is not active';
  end if;
  if v_row.profile_id <> auth.uid() and not public.can_manage_orders() then
    raise exception 'Not authorized';
  end if;

  update public.reservations set status = 'cancelled' where id = p_reservation_id;

  update public.inventory
  set reserved_stock = reserved_stock - v_row.quantity
  where variant_id = v_row.variant_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (v_row.variant_id, 'reservation_release', v_row.quantity, 'Reservation cancelled', auth.uid());
end;
$$;

create or replace function public.expire_reservations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  for v_row in
    select * from public.reservations
    where status = 'active' and expires_at < now()
    for update
  loop
    update public.reservations set status = 'expired' where id = v_row.id;
    update public.inventory
    set reserved_stock = reserved_stock - v_row.quantity
    where variant_id = v_row.variant_id;
    insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
    values (v_row.variant_id, 'reservation_release', v_row.quantity, 'Reservation expired', null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.convert_reservation_to_order(p_reservation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.reservations%rowtype;
  v_cart_id uuid;
  v_order_id uuid;
begin
  if not public.can_manage_orders() then
    raise exception 'Not authorized';
  end if;

  select * into v_row from public.reservations where id = p_reservation_id for update;
  if v_row.status <> 'active' then
    raise exception 'Reservation is not active';
  end if;

  -- release hold then treat as a sale via a temporary cart on the customer account
  update public.inventory
  set reserved_stock = reserved_stock - v_row.quantity
  where variant_id = v_row.variant_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (v_row.variant_id, 'reservation_release', v_row.quantity, 'Converted to order', auth.uid());

  -- create order directly
  insert into public.orders (
    order_number, customer_id, profile_id, order_status, payment_status, fulfillment, payment_method
  )
  select
    'ECMS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 6, '0'),
    v_row.customer_id,
    v_row.profile_id,
    'confirmed',
    'unpaid',
    'pickup',
    'pay_at_store'
  returning id into v_order_id;

  insert into public.order_items (order_id, variant_id, product_name, variant_label, quantity, unit_price)
  select
    v_order_id,
    v.id,
    p.name,
    trim(both ' ' from concat_ws(' · ', v.storage, v.color)),
    v_row.quantity,
    v.price
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = v_row.variant_id;

  update public.inventory
  set total_stock = total_stock - v_row.quantity
  where variant_id = v_row.variant_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (v_row.variant_id, 'sale', v_row.quantity, 'Reservation converted', auth.uid());

  update public.orders o
  set subtotal = oi.qty_total, total = oi.qty_total
  from (
    select order_id, sum(unit_price * quantity) as qty_total
    from public.order_items
    where order_id = v_order_id
    group by order_id
  ) oi
  where o.id = oi.order_id;

  update public.reservations set status = 'converted' where id = p_reservation_id;

  insert into public.payments (order_id, provider, amount, status)
  select v_order_id, 'pay_at_store', total, 'unpaid' from public.orders where id = v_order_id;

  return v_order_id;
end;
$$;

create or replace function public.create_preorder(p_variant_id uuid, p_quantity integer default 1)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id uuid;
  v_enabled boolean;
  v_available integer;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  select preorder_enabled into v_enabled from public.product_variants where id = p_variant_id;
  if coalesce(v_enabled, false) = false then
    raise exception 'Pre-order is not available for this product';
  end if;

  perform public.ensure_inventory(p_variant_id);
  select total_stock - reserved_stock into v_available from public.inventory where variant_id = p_variant_id;
  if v_available > 0 then
    raise exception 'This product is currently in stock. Add it to your cart instead.';
  end if;

  select id into v_customer_id from public.customers where profile_id = auth.uid();
  if v_customer_id is null then
    insert into public.customers (profile_id) values (auth.uid()) returning id into v_customer_id;
  end if;

  insert into public.preorders (customer_id, profile_id, variant_id, quantity)
  values (v_customer_id, auth.uid(), p_variant_id, greatest(p_quantity, 1))
  returning id into v_id;

  insert into public.notifications (user_id, type, title, message)
  values (auth.uid(), 'preorder', 'Pre-order received', 'We will notify you when this product is back in stock.');

  perform public.notify_staff('preorder', 'New pre-order', 'A customer submitted a pre-order.');
  perform public.write_audit('create_preorder', 'preorders', v_id::text, jsonb_build_object('variant_id', p_variant_id));

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Low stock notifier (call after inventory changes from app if needed)
-- ---------------------------------------------------------------------------
create or replace function public.flag_low_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_available integer;
  v_label text;
begin
  v_available := new.total_stock - new.reserved_stock;
  if v_available <= new.min_stock then
    select p.name || coalesce(' · ' || v.storage, '') || coalesce(' · ' || v.color, '')
    into v_label
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = new.variant_id;

    perform public.notify_staff(
      'stock',
      case when v_available <= 0 then 'Out of stock' else 'Low stock' end,
      coalesce(v_label, 'A product') || ' has ' || v_available || ' unit(s) available.'
    );
  end if;
  return new;
end;
$$;

create trigger trg_low_stock
after update of total_stock, reserved_stock on public.inventory
for each row execute procedure public.flag_low_stock();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.brands enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.inventory enable row level security;
alter table public.stock_movements enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.reservations enable row level security;
alter table public.preorders enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;
alter table public.site_settings enable row level security;

-- profiles
create policy "read own profile" on public.profiles for select using (id = auth.uid() or public.is_staff());
create policy "update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = public.current_role());
create policy "admin update profiles" on public.profiles for update using (public.is_admin_like());

-- customers
create policy "read own customer" on public.customers for select using (profile_id = auth.uid() or public.is_staff());
create policy "update own customer" on public.customers for update using (profile_id = auth.uid());
create policy "staff update customers" on public.customers for update using (public.is_staff());

-- catalog public read
create policy "public categories" on public.categories for select using (status = 'active' or public.is_staff());
create policy "staff write categories" on public.categories for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "public brands" on public.brands for select using (status = 'active' or public.is_staff());
create policy "staff write brands" on public.brands for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "public products" on public.products for select using (status = 'active' or public.is_staff());
create policy "staff write products" on public.products for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "public variants" on public.product_variants for select using (status = 'active' or public.is_staff());
create policy "staff write variants" on public.product_variants for all using (public.current_role() = 'admin') with check (public.current_role() = 'admin');

create policy "public inventory" on public.inventory for select using (true);
create policy "inv write inventory" on public.inventory for all using (public.can_manage_inventory()) with check (public.can_manage_inventory());

create policy "staff movements" on public.stock_movements for select using (public.is_staff());
create policy "inv insert movements" on public.stock_movements for insert with check (public.can_manage_inventory());

-- carts
create policy "own carts" on public.carts for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "own cart items" on public.cart_items for all using (
  exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())
) with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.profile_id = auth.uid())
);

-- orders
create policy "own orders" on public.orders for select using (profile_id = auth.uid() or public.can_manage_orders() or public.current_role() = 'store_owner');
create policy "staff update orders" on public.orders for update using (public.can_manage_orders());

create policy "own order items" on public.order_items for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.profile_id = auth.uid() or public.can_manage_orders() or public.current_role() = 'store_owner')
  )
);

create policy "own payments" on public.payments for select using (
  exists (
    select 1 from public.orders o
    where o.id = order_id and (o.profile_id = auth.uid() or public.can_manage_orders() or public.current_role() = 'store_owner')
  )
);
create policy "staff update payments" on public.payments for update using (public.can_manage_orders());

-- reservations / preorders
create policy "own reservations" on public.reservations for select using (profile_id = auth.uid() or public.can_manage_orders());
create policy "staff update reservations" on public.reservations for update using (public.can_manage_orders());

create policy "own preorders" on public.preorders for select using (profile_id = auth.uid() or public.can_manage_orders());
create policy "staff update preorders" on public.preorders for update using (public.can_manage_orders());

-- notifications
create policy "own notifications" on public.notifications for select using (user_id = auth.uid());
create policy "own notifications update" on public.notifications for update using (user_id = auth.uid());

-- audit
create policy "admin audit" on public.audit_logs for select using (public.current_role() in ('admin', 'it_support', 'store_owner'));

-- settings
create policy "public settings" on public.site_settings for select using (true);
create policy "admin settings" on public.site_settings for update using (public.current_role() = 'admin');

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('brand-logos', 'brand-logos', true)
on conflict (id) do nothing;

create policy "public read product images"
on storage.objects for select
using (bucket_id in ('product-images', 'brand-logos'));

create policy "staff write product images"
on storage.objects for insert
with check (
  bucket_id in ('product-images', 'brand-logos')
  and public.current_role() = 'admin'
);

create policy "staff update product images"
on storage.objects for update
using (
  bucket_id in ('product-images', 'brand-logos')
  and public.current_role() = 'admin'
);

create policy "staff delete product images"
on storage.objects for delete
using (
  bucket_id in ('product-images', 'brand-logos')
  and public.current_role() = 'admin'
);

-- ---------------------------------------------------------------------------
-- Grants for RPCs
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.get_or_create_cart() to authenticated;
grant execute on function public.place_order(public.fulfillment_method, public.payment_method, jsonb, text) to authenticated;
grant execute on function public.create_reservation(uuid, integer) to authenticated;
grant execute on function public.cancel_reservation(uuid) to authenticated;
grant execute on function public.create_preorder(uuid, integer) to authenticated;
grant execute on function public.add_stock(uuid, integer, text) to authenticated;
grant execute on function public.remove_stock(uuid, integer, text) to authenticated;
grant execute on function public.adjust_stock(uuid, integer, text) to authenticated;
grant execute on function public.convert_reservation_to_order(uuid) to authenticated;
grant execute on function public.expire_reservations() to authenticated;

-- Views: expose availability to everyone
grant select on public.variant_availability to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, anon;
