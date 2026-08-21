-- Extend payment options for checkout (card, wallets, Cameroon mobile money).
-- Safe to re-run: ADD VALUE IF NOT EXISTS is Postgres 9.1+ compatible via DO blocks.

do $$ begin
  alter type public.payment_method add value if not exists 'paypal';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.payment_method add value if not exists 'apple_pay';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.payment_method add value if not exists 'google_pay';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.payment_method add value if not exists 'orange_money';
exception when duplicate_object then null;
end $$;

do $$ begin
  alter type public.payment_method add value if not exists 'mtn_momo';
exception when duplicate_object then null;
end $$;

-- Online / mobile payments are recorded as pending until staff confirms settlement.
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
  v_provider text;
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

  update public.orders
  set subtotal = v_subtotal, total = v_subtotal
  where id = v_order_id;

  insert into public.payments (order_id, provider, amount, status)
  values (v_order_id, v_provider, v_subtotal, v_payment_status);

  delete from public.cart_items where cart_id = v_cart_id;

  insert into public.notifications (user_id, type, title, message)
  values (auth.uid(), 'order', 'Order placed', 'Your order ' || v_order_number || ' has been received.');

  perform public.notify_staff('order', 'New order', 'Order ' || v_order_number || ' was placed.');
  perform public.write_audit('place_order', 'orders', v_order_id::text, jsonb_build_object('order_number', v_order_number, 'total', v_subtotal));

  return v_order_id;
end;
$$;
