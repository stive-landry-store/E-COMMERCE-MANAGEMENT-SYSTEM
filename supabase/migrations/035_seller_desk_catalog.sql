-- Seller desk: own categories/brands; co-admin/admin keep full access.
-- Regular sellers can manage reservations on their own products.

alter table public.categories
  add column if not exists seller_id uuid references public.sellers (id) on delete set null;

create index if not exists categories_seller_idx on public.categories (seller_id);

drop policy if exists "staff write categories" on public.categories;
drop policy if exists categories_principal_write on public.categories;
drop policy if exists categories_seller_select on public.categories;
drop policy if exists categories_seller_insert on public.categories;
drop policy if exists categories_seller_update on public.categories;
drop policy if exists categories_seller_delete on public.categories;

create policy categories_principal_write on public.categories
for all
using (public.is_principal_admin())
with check (public.is_principal_admin());

create policy categories_seller_select on public.categories
for select
to authenticated
using (seller_id = public.current_seller_id());

create policy categories_seller_insert on public.categories
for insert
to authenticated
with check (
  public.current_seller_id() is not null
  and seller_id = public.current_seller_id()
  and coalesce(show_on_home, false) = false
);

create policy categories_seller_update on public.categories
for update
to authenticated
using (seller_id = public.current_seller_id())
with check (
  seller_id = public.current_seller_id()
  and coalesce(show_on_home, false) = false
);

create policy categories_seller_delete on public.categories
for delete
to authenticated
using (seller_id = public.current_seller_id());

grant insert, update, delete on public.categories to authenticated;

drop policy if exists brands_seller_update on public.brands;
drop policy if exists brands_seller_delete on public.brands;

create policy brands_seller_update on public.brands
for update
to authenticated
using (seller_id = public.current_seller_id())
with check (seller_id = public.current_seller_id());

create policy brands_seller_delete on public.brands
for delete
to authenticated
using (seller_id = public.current_seller_id());

create or replace function public.seller_owns_variant(p_variant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.product_variants v
    join public.products p on p.id = v.product_id
    where v.id = p_variant_id
      and p.seller_id is not null
      and p.seller_id = public.current_seller_id()
  );
$$;

grant execute on function public.seller_owns_variant(uuid) to authenticated;

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
  if v_row.profile_id <> auth.uid()
     and not public.can_manage_orders()
     and not public.seller_owns_variant(v_row.variant_id) then
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

create or replace function public.convert_reservation_to_order(p_reservation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.reservations%rowtype;
  v_order_id uuid;
begin
  select * into v_row from public.reservations where id = p_reservation_id for update;
  if v_row.id is null then
    raise exception 'Reservation not found';
  end if;
  if v_row.status <> 'active' then
    raise exception 'Reservation is not active';
  end if;
  if not public.can_manage_orders() and not public.seller_owns_variant(v_row.variant_id) then
    raise exception 'Not authorized';
  end if;

  update public.inventory
  set reserved_stock = reserved_stock - v_row.quantity
  where variant_id = v_row.variant_id;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (v_row.variant_id, 'reservation_release', v_row.quantity, 'Converted to order', auth.uid());

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
  if not public.can_manage_orders() then
    raise exception 'Not authorized';
  end if;

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
