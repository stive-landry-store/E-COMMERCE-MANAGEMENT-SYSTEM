-- Seller-owned promo codes for marketplace products & services

create table if not exists public.seller_promo_codes (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.sellers (id) on delete cascade,
  code text not null,
  description text,
  discount_percent numeric(5, 2) not null check (discount_percent > 0 and discount_percent <= 100),
  is_active boolean not null default true,
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  constraint seller_promo_codes_seller_code_unique unique (seller_id, code)
);

create index if not exists seller_promo_codes_code_idx on public.seller_promo_codes (lower(code));
create index if not exists seller_promo_codes_seller_idx on public.seller_promo_codes (seller_id, is_active);

-- Optional product scope: empty = all seller listings
create table if not exists public.seller_promo_code_products (
  promo_code_id uuid not null references public.seller_promo_codes (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  primary key (promo_code_id, product_id)
);

alter table public.orders
  add column if not exists promo_code text,
  add column if not exists discount_percent numeric(5, 2),
  add column if not exists discount_amount numeric(12, 2) not null default 0,
  add column if not exists seller_promo_id uuid references public.seller_promo_codes (id) on delete set null;

alter table public.seller_promo_codes enable row level security;
alter table public.seller_promo_code_products enable row level security;

drop policy if exists seller_promo_codes_owner on public.seller_promo_codes;
create policy seller_promo_codes_owner on public.seller_promo_codes
  for all
  using (
    public.is_admin_like()
    or seller_id = public.current_seller_id()
  )
  with check (
    public.is_admin_like()
    or seller_id = public.current_seller_id()
  );

drop policy if exists seller_promo_code_products_owner on public.seller_promo_code_products;
create policy seller_promo_code_products_owner on public.seller_promo_code_products
  for all
  using (
    public.is_admin_like()
    or exists (
      select 1 from public.seller_promo_codes spc
      where spc.id = promo_code_id and spc.seller_id = public.current_seller_id()
    )
  )
  with check (
    public.is_admin_like()
    or exists (
      select 1 from public.seller_promo_codes spc
      where spc.id = promo_code_id and spc.seller_id = public.current_seller_id()
    )
  );

grant select, insert, update, delete on public.seller_promo_codes to authenticated;
grant select, insert, update, delete on public.seller_promo_code_products to authenticated;

create or replace function public.seller_promo_product_eligible(
  p_promo_id uuid,
  p_product_id uuid,
  p_seller_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.products pr
    where pr.id = p_product_id
      and pr.seller_id = p_seller_id
  )
  and (
    not exists (
      select 1 from public.seller_promo_code_products spcp
      where spcp.promo_code_id = p_promo_id
    )
    or exists (
      select 1 from public.seller_promo_code_products spcp
      where spcp.promo_code_id = p_promo_id
        and spcp.product_id = p_product_id
    )
  );
$$;

create or replace function public.validate_seller_promo_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cart_id uuid;
  v_promo public.seller_promo_codes%rowtype;
  v_eligible numeric := 0;
  v_discount numeric := 0;
  v_item record;
begin
  if auth.uid() is null then
    return jsonb_build_object('valid', false, 'error', 'Sign in required');
  end if;

  if p_code is null or btrim(p_code) = '' then
    return jsonb_build_object('valid', false, 'error', 'Code required');
  end if;

  v_cart_id := public.get_or_create_cart();

  select * into v_promo
  from public.seller_promo_codes spc
  where lower(spc.code) = lower(btrim(p_code))
    and spc.is_active = true
    and (spc.starts_at is null or spc.starts_at <= now())
    and (spc.ends_at is null or spc.ends_at >= now())
    and (spc.max_uses is null or spc.used_count < spc.max_uses)
  limit 1;

  if v_promo.id is null then
    return jsonb_build_object('valid', false, 'error', 'Invalid or expired code');
  end if;

  for v_item in
    select ci.quantity, v.price, p.id as product_id, p.seller_id
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.cart_id = v_cart_id
  loop
    if v_item.seller_id = v_promo.seller_id
       and public.seller_promo_product_eligible(v_promo.id, v_item.product_id, v_promo.seller_id) then
      v_eligible := v_eligible + (v_item.price * v_item.quantity);
    end if;
  end loop;

  if v_eligible <= 0 then
    return jsonb_build_object('valid', false, 'error', 'Code does not apply to items in your cart');
  end if;

  v_discount := round(v_eligible * v_promo.discount_percent / 100.0, 0);

  return jsonb_build_object(
    'valid', true,
    'code', v_promo.code,
    'promo_id', v_promo.id,
    'seller_id', v_promo.seller_id,
    'discount_percent', v_promo.discount_percent,
    'eligible_subtotal', v_eligible,
    'discount_amount', v_discount
  );
end;
$$;

drop function if exists public.place_order(public.fulfillment_method, public.payment_method, jsonb, text);

create or replace function public.place_order(
  p_fulfillment public.fulfillment_method,
  p_payment_method public.payment_method,
  p_address jsonb default null,
  p_notes text default null,
  p_promo_code text default null
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
  v_discount numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_order_number text;
  v_payment_status public.payment_status := 'unpaid';
  v_provider text;
  v_promo public.seller_promo_codes%rowtype;
  v_eligible numeric := 0;
  v_applied_code text := null;
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

  if p_payment_method in ('card', 'paypal', 'apple_pay', 'google_pay', 'orange_money', 'mtn_momo') then
    v_payment_status := 'pending';
  end if;

  v_provider := case p_payment_method
    when 'pay_at_store' then 'pay_at_store'
    when 'card' then 'card'
    when 'paypal' then 'paypal'
    when 'apple_pay' then 'apple_pay'
    when 'google_pay' then 'google_pay'
    when 'orange_money' then 'orange_money'
    when 'mtn_momo' then 'mtn_momo'
    else p_payment_method::text
  end;

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

  if p_promo_code is not null and btrim(p_promo_code) <> '' then
    select * into v_promo
    from public.seller_promo_codes spc
    where lower(spc.code) = lower(btrim(p_promo_code))
      and spc.is_active = true
      and (spc.starts_at is null or spc.starts_at <= now())
      and (spc.ends_at is null or spc.ends_at >= now())
      and (spc.max_uses is null or spc.used_count < spc.max_uses)
    limit 1;

    if v_promo.id is null then
      raise exception 'Invalid or expired promo code';
    end if;

    for v_item in
      select ci.quantity, v.price, p.id as product_id, p.seller_id
      from public.cart_items ci
      join public.product_variants v on v.id = ci.variant_id
      join public.products p on p.id = v.product_id
      where ci.cart_id = v_cart_id
    loop
      if v_item.seller_id = v_promo.seller_id
         and public.seller_promo_product_eligible(v_promo.id, v_item.product_id, v_promo.seller_id) then
        v_eligible := v_eligible + (v_item.price * v_item.quantity);
      end if;
    end loop;

    if v_eligible <= 0 then
      raise exception 'Promo code does not apply to items in your cart';
    end if;

    v_discount := round(v_eligible * v_promo.discount_percent / 100.0, 0);
    v_applied_code := v_promo.code;

    update public.seller_promo_codes
    set used_count = used_count + 1
    where id = v_promo.id;
  end if;

  v_total := greatest(v_subtotal - v_discount, 0);

  update public.orders
  set
    subtotal = v_subtotal,
    total = v_total,
    promo_code = v_applied_code,
    discount_percent = case when v_promo.id is not null then v_promo.discount_percent else null end,
    discount_amount = v_discount,
    seller_promo_id = v_promo.id
  where id = v_order_id;

  insert into public.payments (order_id, provider, amount, status)
  values (v_order_id, v_provider, v_total, v_payment_status);

  delete from public.cart_items where cart_id = v_cart_id;

  insert into public.notifications (user_id, type, title, message)
  values (auth.uid(), 'order', 'Order placed', 'Your order ' || v_order_number || ' has been received.');

  perform public.notify_staff('order', 'New order', 'Order ' || v_order_number || ' was placed.');
  perform public.write_audit(
    'place_order',
    'orders',
    v_order_id::text,
    jsonb_build_object('order_number', v_order_number, 'subtotal', v_subtotal, 'discount', v_discount, 'total', v_total)
  );

  return v_order_id;
end;
$$;

grant execute on function public.seller_promo_product_eligible(uuid, uuid, uuid) to authenticated;
grant execute on function public.validate_seller_promo_code(text) to authenticated;
grant execute on function public.place_order(public.fulfillment_method, public.payment_method, jsonb, text, text) to authenticated;
