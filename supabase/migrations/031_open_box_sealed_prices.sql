-- 031: Open-box (non-scellé) market prices + sealed estimates + cart condition
-- Prices in FCFA. "k" from merchant list = ×1000. Open box = non scellé.
-- Sealed ≈ open box +10–15% (older higher %).

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------
alter table public.product_variants
  add column if not exists price_sealed numeric(12, 2);

comment on column public.product_variants.price is 'Open box / non-scellé price (FCFA)';
comment on column public.product_variants.price_sealed is 'Sealed / scellé price (FCFA); null = not offered as sealed';

alter table public.cart_items
  add column if not exists phone_condition text not null default 'open_box'
    check (phone_condition in ('open_box', 'sealed'));

alter table public.cart_items drop constraint if exists cart_items_cart_id_variant_id_key;
alter table public.cart_items drop constraint if exists cart_items_cart_id_variant_id_phone_condition_key;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'cart_items_cart_id_variant_id_phone_condition_key'
  ) then
    alter table public.cart_items
      add constraint cart_items_cart_id_variant_id_phone_condition_key
      unique (cart_id, variant_id, phone_condition);
  end if;
end $$;

-- Normalize storage labels: "128 Go", "128GB", "128 G", "1 To", "1TB" → "128gb" / "1tb"
create or replace function public.norm_storage(s text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      replace(replace(replace(replace(lower(trim(coalesce(s, ''))), ' ', ''), 'go', 'gb'), 'to', 'tb'), 'ô', 'o'),
      '[^0-9a-z]',
      '',
      'g'
    ),
    ''
  );
$$;

-- ---------------------------------------------------------------------------
-- Apply open-box + sealed prices by product name + storage
-- ---------------------------------------------------------------------------
create temporary table tmp_phone_prices (
  product_name text not null,
  storage_key text not null,
  price_open numeric(12, 2) not null,
  price_sealed numeric(12, 2) not null
) on commit drop;

insert into tmp_phone_prices (product_name, storage_key, price_open, price_sealed) values
-- iPhone XR (+15 000 FCFA marge)
('iPhone XR', '64gb', 83000, 93000),
('iPhone XR', '128gb', 89000, 100000),
('iPhone XR', '256gb', 95000, 107000),
-- iPhone 11 (+15k)
('iPhone 11', '64gb', 98000, 110000),
('iPhone 11', '128gb', 104000, 117000),
('iPhone 11', '256gb', 115000, 130000),
-- iPhone 11 Pro (+15k)
('iPhone 11 Pro', '64gb', 120000, 136000),
('iPhone 11 Pro', '128gb', 125000, 141000),
('iPhone 11 Pro', '256gb', 130000, 147000),
('iPhone 11 Pro', '512gb', 135000, 153000),
-- iPhone 11 Pro Max (+15k)
('iPhone 11 Pro Max', '64gb', 125000, 141000),
('iPhone 11 Pro Max', '128gb', 133000, 151000),
('iPhone 11 Pro Max', '256gb', 140000, 159000),
('iPhone 11 Pro Max', '512gb', 147000, 167000),
-- iPhone 12 mini (+15k)
('iPhone 12 mini', '64gb', 105000, 118000),
('iPhone 12 mini', '128gb', 110000, 124000),
('iPhone 12 mini', '256gb', 115000, 130000),
-- iPhone 12 (+15k)
('iPhone 12', '64gb', 110000, 124000),
('iPhone 12', '128gb', 114000, 129000),
('iPhone 12', '256gb', 123000, 139000),
-- iPhone 12 Pro (+15k)
('iPhone 12 Pro', '128gb', 145000, 165000),
('iPhone 12 Pro', '256gb', 152000, 173000),
('iPhone 12 Pro', '512gb', 160000, 182000),
-- iPhone 12 Pro Max (+15k)
('iPhone 12 Pro Max', '128gb', 175000, 199000),
('iPhone 12 Pro Max', '256gb', 187000, 213000),
('iPhone 12 Pro Max', '512gb', 200000, 228000),
-- iPhone 13 mini (+20 000 FCFA marge)
('iPhone 13 mini', '128gb', 145000, 160000),
('iPhone 13 mini', '256gb', 153000, 169000),
('iPhone 13 mini', '512gb', 162000, 179000),
-- iPhone 13 (+20k)
('iPhone 13', '128gb', 155000, 171000),
('iPhone 13', '256gb', 163000, 180000),
('iPhone 13', '512gb', 175000, 194000),
-- iPhone 13 Pro (+20k)
('iPhone 13 Pro', '128gb', 208000, 231000),
('iPhone 13 Pro', '256gb', 223000, 247000),
('iPhone 13 Pro', '512gb', 230000, 255000),
('iPhone 13 Pro', '1tb', 245000, 272000),
-- iPhone 13 Pro Max (+20k)
('iPhone 13 Pro Max', '128gb', 235000, 261000),
('iPhone 13 Pro Max', '256gb', 260000, 289000),
('iPhone 13 Pro Max', '512gb', 280000, 311000),
('iPhone 13 Pro Max', '1tb', 300000, 334000),
-- iPhone 14 (+20k)
('iPhone 14', '128gb', 175000, 194000),
('iPhone 14', '256gb', 195000, 216000),
('iPhone 14', '512gb', 215000, 238000),
-- iPhone 14 Plus (+20k)
('iPhone 14 Plus', '128gb', 190000, 210000),
('iPhone 14 Plus', '256gb', 210000, 233000),
('iPhone 14 Plus', '512gb', 230000, 255000),
-- iPhone 14 Pro (+25 000 FCFA marge)
('iPhone 14 Pro', '128gb', 270000, 299000),
('iPhone 14 Pro', '256gb', 290000, 322000),
('iPhone 14 Pro', '512gb', 310000, 344000),
('iPhone 14 Pro', '1tb', 330000, 367000),
-- iPhone 14 Pro Max (+25k)
('iPhone 14 Pro Max', '128gb', 300000, 333000),
('iPhone 14 Pro Max', '256gb', 320000, 355000),
('iPhone 14 Pro Max', '512gb', 335000, 372000),
('iPhone 14 Pro Max', '1tb', 350000, 389000),
-- iPhone 15 (+25k)
('iPhone 15', '128gb', 265000, 289000),
('iPhone 15', '256gb', 285000, 311000),
('iPhone 15', '512gb', 315000, 344000),
-- iPhone 15 Plus (+25k)
('iPhone 15 Plus', '128gb', 265000, 289000),
('iPhone 15 Plus', '256gb', 285000, 311000),
('iPhone 15 Plus', '512gb', 315000, 344000),
-- iPhone 15 Pro (+25k)
('iPhone 15 Pro', '128gb', 320000, 350000),
('iPhone 15 Pro', '256gb', 350000, 383000),
('iPhone 15 Pro', '512gb', 385000, 421000),
('iPhone 15 Pro', '1tb', 415000, 454000),
-- iPhone 15 Pro Max (+35 000 FCFA marge)
('iPhone 15 Pro Max', '256gb', 395000, 431000),
('iPhone 15 Pro Max', '512gb', 415000, 453000),
('iPhone 15 Pro Max', '1tb', 445000, 486000),
-- Older iPhones (estimated vs XR/11 market drop)
('iPhone 7', '32gb', 28000, 32000),
('iPhone 7', '128gb', 35000, 40000),
('iPhone 7', '256gb', 42000, 48000),
('iPhone 7 Plus', '32gb', 38000, 44000),
('iPhone 7 Plus', '128gb', 45000, 52000),
('iPhone 7 Plus', '256gb', 52000, 60000),
('iPhone 8', '64gb', 45000, 52000),
('iPhone 8', '128gb', 52000, 60000),
('iPhone 8', '256gb', 58000, 67000),
('iPhone 8 Plus', '64gb', 55000, 63000),
('iPhone 8 Plus', '128gb', 62000, 71000),
('iPhone 8 Plus', '256gb', 70000, 80000),
('iPhone X', '64gb', 60000, 69000),
('iPhone X', '256gb', 72000, 83000),
('iPhone XS', '64gb', 75000, 86000),
('iPhone XS', '256gb', 88000, 101000),
('iPhone XS', '512gb', 98000, 113000),
('iPhone XS Max', '64gb', 85000, 98000),
('iPhone XS Max', '256gb', 98000, 113000),
('iPhone XS Max', '512gb', 108000, 124000),
-- iPhone 16 / 17 (+35k)
('iPhone 16', '128gb', 305000, 332000),
('iPhone 16', '256gb', 330000, 359000),
('iPhone 16', '512gb', 365000, 398000),
('iPhone 16 Plus', '128gb', 310000, 337000),
('iPhone 16 Plus', '256gb', 335000, 365000),
('iPhone 16 Plus', '512gb', 370000, 403000),
('iPhone 16 Pro', '128gb', 370000, 403000),
('iPhone 16 Pro', '256gb', 400000, 436000),
('iPhone 16 Pro', '512gb', 435000, 475000),
('iPhone 16 Pro', '1tb', 470000, 513000),
('iPhone 16 Pro Max', '256gb', 435000, 475000),
('iPhone 16 Pro Max', '512gb', 465000, 508000),
('iPhone 16 Pro Max', '1tb', 500000, 546000),
('iPhone 16e', '128gb', 235000, 255000),
('iPhone 16e', '256gb', 255000, 277000),
('iPhone 16e', '512gb', 280000, 304000),
('iPhone 17', '256gb', 365000, 398000),
('iPhone 17', '512gb', 405000, 442000),
('iPhone 17e', '128gb', 265000, 288000),
('iPhone 17e', '256gb', 290000, 315000),
('iPhone 17 Pro', '256gb', 455000, 497000),
('iPhone 17 Pro', '512gb', 495000, 541000),
('iPhone 17 Pro', '1tb', 535000, 585000),
('iPhone 17 Pro Max', '256gb', 515000, 563000),
('iPhone 17 Pro Max', '512gb', 555000, 607000),
('iPhone 17 Pro Max', '1tb', 595000, 651000),
('iPhone Air', '256gb', 415000, 453000),
('iPhone Air', '512gb', 455000, 497000),
('iPhone Air', '1tb', 495000, 541000),
-- Tablets (merchant + sealed est.)
('iPad Air 2', '64gb', 50000, 58000),
('iPad (6th generation)', '128gb', 60000, 69000),
('iPad 6', '128gb', 60000, 69000),
('iPad 6th generation', '128gb', 60000, 69000),
-- Google Pixel (merchant)
('Pixel 8', '128gb', 160000, 180000),
('Google Pixel 8', '128gb', 160000, 180000),
('Pixel 8a', '128gb', 155000, 174000),
('Google Pixel 8a', '128gb', 155000, 174000),
('Pixel 8 Pro', '128gb', 220000, 247000),
('Google Pixel 8 Pro', '128gb', 220000, 247000),
-- Samsung (merchant)
('Galaxy S21 Ultra', '128gb', 160000, 184000),
('Samsung Galaxy S21 Ultra', '128gb', 160000, 184000),
('Galaxy S23 Ultra', '256gb', 275000, 308000),
('Samsung Galaxy S23 Ultra', '256gb', 275000, 308000),
('Galaxy S23 Ultra', '512gb', 295000, 330000),
('Samsung Galaxy S23 Ultra', '512gb', 295000, 330000),
('Galaxy S25 Ultra', '256gb', 470000, 517000),
('Samsung Galaxy S25 Ultra', '256gb', 470000, 517000),
('Galaxy Tab S5e', '64gb', 55000, 63000),
('Samsung Galaxy Tab S5e', '64gb', 55000, 63000);

update public.product_variants v
set
  price = t.price_open,
  price_sealed = t.price_sealed
from public.products p, tmp_phone_prices t
where v.product_id = p.id
  and lower(trim(p.name)) = lower(trim(t.product_name))
  and public.norm_storage(v.storage) = t.storage_key;

-- Sync product base_price = cheapest open-box variant
update public.products p
set base_price = sub.min_price
from (
  select product_id, min(price) as min_price
  from public.product_variants
  where status = 'active'
  group by product_id
) sub
where p.id = sub.product_id
  and exists (
    select 1 from public.product_variants v2
    where v2.product_id = p.id and v2.price_sealed is not null
  );

-- ---------------------------------------------------------------------------
-- Ensure Pixel / Samsung / tablet products exist (idempotent by slug)
-- ---------------------------------------------------------------------------
insert into public.brands (name, slug, status)
values
  ('Google', 'google', 'active'),
  ('Samsung', 'samsung', 'active')
on conflict (slug) do nothing;

insert into public.categories (name, slug, description, status)
values
  ('Android Phones', 'android-phones', 'Google Pixel and Samsung Galaxy.', 'active'),
  ('Tablets', 'tablets', 'iPad and Android tablets.', 'active')
on conflict (slug) do nothing;

-- Helper: upsert a simple phone product with one variant if missing
do $$
declare
  r record;
  v_brand uuid;
  v_cat uuid;
  v_product uuid;
  v_variant uuid;
begin
  for r in
    select * from (values
      ('google', 'android-phones', 'Google Pixel 8', 'google-pixel-8', 'PX8-128-BLK', '128GB', 'Black', 160000::numeric, 180000::numeric),
      ('google', 'android-phones', 'Google Pixel 8a', 'google-pixel-8a', 'PX8A-128-BLK', '128GB', 'Black', 155000::numeric, 174000::numeric),
      ('google', 'android-phones', 'Google Pixel 8 Pro', 'google-pixel-8-pro', 'PX8P-128-BLK', '128GB', 'Black', 220000::numeric, 247000::numeric),
      ('samsung', 'android-phones', 'Samsung Galaxy S21 Ultra', 'samsung-galaxy-s21-ultra', 'SGS21U-128-BLK', '128GB', 'Black', 160000::numeric, 184000::numeric),
      ('samsung', 'android-phones', 'Samsung Galaxy S23 Ultra', 'samsung-galaxy-s23-ultra', 'SGS23U-256-BLK', '256GB', 'Black', 275000::numeric, 308000::numeric),
      ('samsung', 'android-phones', 'Samsung Galaxy S25 Ultra', 'samsung-galaxy-s25-ultra', 'SGS25U-256-BLK', '256GB', 'Black', 470000::numeric, 517000::numeric),
      ('samsung', 'tablets', 'Samsung Galaxy Tab S5e', 'samsung-galaxy-tab-s5e', 'SGTABS5E-64-BLK', '64GB', 'Black', 55000::numeric, 63000::numeric),
      ('apple', 'ipad', 'iPad Air 2', 'ipad-air-2', 'IPADAIR2-64-SLV', '64GB', 'Silver', 50000::numeric, 58000::numeric),
      ('apple', 'ipad', 'iPad (6th generation)', 'ipad-6th-generation', 'IPAD6-128-SLV', '128GB', 'Silver', 60000::numeric, 69000::numeric)
    ) as x(brand_slug, cat_slug, pname, pslug, sku, storage, color, popen, psealed)
  loop
    select id into v_brand from public.brands where slug = r.brand_slug limit 1;
    select id into v_cat from public.categories where slug = r.cat_slug limit 1;
    if v_brand is null or v_cat is null then
      continue;
    end if;

    select id into v_product from public.products where slug = r.pslug limit 1;
    if v_product is null then
      insert into public.products (sku, brand_id, category_id, name, slug, description, base_price, status, featured)
      values (
        r.sku || '-P',
        v_brand, v_cat, r.pname, r.pslug,
        r.pname || ' — open box & sealed available at Stive Landry Store.',
        r.popen, 'active', false
      )
      returning id into v_product;
    else
      update public.products set base_price = r.popen, status = 'active' where id = v_product;
    end if;

    select id into v_variant from public.product_variants where sku = r.sku limit 1;
    if v_variant is null then
      insert into public.product_variants (product_id, storage, color, sku, price, price_sealed, status)
      values (v_product, r.storage, r.color, r.sku, r.popen, r.psealed, 'active')
      returning id into v_variant;
      perform public.ensure_inventory(v_variant);
      update public.inventory set total_stock = greatest(total_stock, 5) where variant_id = v_variant;
    else
      update public.product_variants
      set price = r.popen, price_sealed = r.psealed, storage = r.storage, status = 'active'
      where id = v_variant;
    end if;
  end loop;

  -- Extra storage for S23 Ultra 512
  select id into v_product from public.products where slug = 'samsung-galaxy-s23-ultra' limit 1;
  if v_product is not null and not exists (select 1 from public.product_variants where sku = 'SGS23U-512-BLK') then
    insert into public.product_variants (product_id, storage, color, sku, price, price_sealed, status)
    values (v_product, '512GB', 'Black', 'SGS23U-512-BLK', 295000, 330000, 'active')
    returning id into v_variant;
    perform public.ensure_inventory(v_variant);
    update public.inventory set total_stock = greatest(total_stock, 5) where variant_id = v_variant;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- place_order: charge sealed vs open-box from cart_items.phone_condition
-- ---------------------------------------------------------------------------
drop function if exists public.place_order(public.fulfillment_method, public.payment_method, jsonb, text, text);

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
  v_unit numeric(12, 2);
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_order_number text;
  v_payment_status public.payment_status := 'unpaid';
  v_provider text;
  v_promo public.seller_promo_codes%rowtype;
  v_eligible numeric := 0;
  v_applied_code text := null;
  v_label text;
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
    select
      ci.variant_id,
      ci.quantity,
      ci.phone_condition,
      v.price,
      v.price_sealed,
      v.sku,
      v.storage,
      v.color,
      p.name as product_name
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

    v_unit := case
      when v_item.phone_condition = 'sealed' and v_item.price_sealed is not null then v_item.price_sealed
      else v_item.price
    end;

    v_label := trim(both ' ' from concat_ws(
      ' · ',
      v_item.storage,
      v_item.color,
      case when v_item.phone_condition = 'sealed' then 'Scellé' else 'Open box' end
    ));

    insert into public.order_items (order_id, variant_id, product_name, variant_label, quantity, unit_price)
    values (
      v_order_id,
      v_item.variant_id,
      v_item.product_name,
      v_label,
      v_item.quantity,
      v_unit
    );

    insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
    values (v_item.variant_id, 'sale', v_item.quantity, 'Order ' || v_order_number, auth.uid());

    v_subtotal := v_subtotal + (v_unit * v_item.quantity);
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
      select
        ci.quantity,
        ci.phone_condition,
        v.price,
        v.price_sealed,
        p.id as product_id,
        p.seller_id
      from public.cart_items ci
      join public.product_variants v on v.id = ci.variant_id
      join public.products p on p.id = v.product_id
      where ci.cart_id = v_cart_id
    loop
      if v_item.seller_id = v_promo.seller_id
         and public.seller_promo_product_eligible(v_promo.id, v_item.product_id, v_promo.seller_id) then
        v_unit := case
          when v_item.phone_condition = 'sealed' and v_item.price_sealed is not null then v_item.price_sealed
          else v_item.price
        end;
        v_eligible := v_eligible + (v_unit * v_item.quantity);
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

grant execute on function public.place_order(public.fulfillment_method, public.payment_method, jsonb, text, text) to authenticated;

-- Promo validation must use sealed/open-box unit prices too
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
  v_unit numeric(12, 2);
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
    select ci.quantity, ci.phone_condition, v.price, v.price_sealed, p.id as product_id, p.seller_id
    from public.cart_items ci
    join public.product_variants v on v.id = ci.variant_id
    join public.products p on p.id = v.product_id
    where ci.cart_id = v_cart_id
  loop
    if v_item.seller_id = v_promo.seller_id
       and public.seller_promo_product_eligible(v_promo.id, v_item.product_id, v_promo.seller_id) then
      v_unit := case
        when v_item.phone_condition = 'sealed' and v_item.price_sealed is not null then v_item.price_sealed
        else v_item.price
      end;
      v_eligible := v_eligible + (v_unit * v_item.quantity);
    end if;
  end loop;

  if v_eligible <= 0 then
    return jsonb_build_object('valid', false, 'error', 'Code does not apply to cart items');
  end if;

  v_discount := round(v_eligible * v_promo.discount_percent / 100.0, 0);

  return jsonb_build_object(
    'valid', true,
    'code', v_promo.code,
    'discount_percent', v_promo.discount_percent,
    'eligible_amount', v_eligible,
    'discount_amount', v_discount
  );
end;
$$;

grant execute on function public.validate_seller_promo_code(text) to authenticated;
