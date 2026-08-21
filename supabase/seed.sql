-- Demo catalog for Stive Landry Store (small sample).
-- Prefer the full Apple lineup: run supabase/seed_apple_catalog.sql after migrations.
-- Order: 001_initial → 002_sellers → 003_category_images → 004_payment_methods → seed_apple_catalog.sql
-- This file remains safe for a tiny demo catalog.

insert into public.categories (name, slug, description, image_url, sort_order, show_on_home)
values
  ('Laptop / MacBook', 'laptop-macbook', 'MacBook Air, MacBook Pro and premium laptops.', '/categories/macbook.jpg', 10, true),
  ('iPhone', 'iphone', 'Latest and previous-generation Apple iPhones.', '/categories/iphone.jpg', 20, true),
  ('Accessories', 'accessories', 'Cases, chargers, cables and protection.', '/categories/accessories.jpg', 40, true),
  ('Audio', 'audio', 'AirPods, headphones and speakers.', '/categories/audio.jpg', 30, true),
  ('Wearables', 'wearables', 'Apple Watch and fitness wearables.', '/categories/wearables.jpg', 50, true)
on conflict (slug) do update
set
  description = excluded.description,
  image_url = coalesce(public.categories.image_url, excluded.image_url),
  sort_order = excluded.sort_order,
  show_on_home = true;

insert into public.brands (name, slug)
values
  ('Apple', 'apple'),
  ('Samsung', 'samsung'),
  ('Anker', 'anker'),
  ('Sony', 'sony')
on conflict (slug) do nothing;

insert into public.products (sku, name, slug, brand_id, category_id, description, specs, base_price, featured, status)
select
  'IP15-BASE',
  'iPhone 15',
  'iphone-15',
  b.id,
  c.id,
  'The iPhone 15 with a durable color-infused glass back, the Dynamic Island, and a 48MP Main camera. Available in multiple storage sizes and colors.',
  '{"display":"6.1-inch Super Retina XDR","chip":"A16 Bionic","camera":"48MP Main","battery":"All-day battery life"}'::jsonb,
  450000,
  true,
  'active'
from public.brands b, public.categories c
where b.slug = 'apple' and c.slug = 'iphone'
on conflict (slug) do nothing;

insert into public.products (sku, name, slug, brand_id, category_id, description, specs, base_price, featured, status)
select
  'IP15P-BASE',
  'iPhone 15 Pro',
  'iphone-15-pro',
  b.id,
  c.id,
  'Titanium design, A17 Pro chip, and a pro camera system. Built for customers who want the flagship experience.',
  '{"display":"6.1-inch Super Retina XDR","chip":"A17 Pro","camera":"48MP Pro camera system","material":"Titanium"}'::jsonb,
  720000,
  true,
  'active'
from public.brands b, public.categories c
where b.slug = 'apple' and c.slug = 'iphone'
on conflict (slug) do nothing;

insert into public.products (sku, name, slug, brand_id, category_id, description, specs, base_price, featured, status)
select
  'IP14-BASE',
  'iPhone 14',
  'iphone-14',
  b.id,
  c.id,
  'A proven all-day iPhone with Dual-camera system and Crash Detection. Excellent value for everyday use.',
  '{"display":"6.1-inch Super Retina XDR","chip":"A15 Bionic","camera":"Dual 12MP"}'::jsonb,
  320000,
  true,
  'active'
from public.brands b, public.categories c
where b.slug = 'apple' and c.slug = 'iphone'
on conflict (slug) do nothing;

insert into public.products (sku, name, slug, brand_id, category_id, description, specs, base_price, featured, status)
select
  'APP-AIRPODS-PRO2',
  'AirPods Pro (2nd generation)',
  'airpods-pro-2',
  b.id,
  c.id,
  'Active Noise Cancellation, Adaptive Audio, and a MagSafe charging case. Ready for calls, commute and studio use.',
  '{"anc":"Active Noise Cancellation","chip":"H2","case":"MagSafe Charging Case"}'::jsonb,
  145000,
  true,
  'active'
from public.brands b, public.categories c
where b.slug = 'apple' and c.slug = 'audio'
on conflict (slug) do nothing;

insert into public.products (sku, name, slug, brand_id, category_id, description, specs, base_price, featured, status)
select
  'AW9-BASE',
  'Apple Watch Series 9',
  'apple-watch-series-9',
  b.id,
  c.id,
  'A powerful health companion with a brighter display and on-device Siri. Available for pre-order when a size is out of stock.',
  '{"display":"Always-On Retina","chip":"S9 SiP","health":"Heart rate, SpO2, crash detection"}'::jsonb,
  280000,
  false,
  'active'
from public.brands b, public.categories c
where b.slug = 'apple' and c.slug = 'wearables'
on conflict (slug) do nothing;

insert into public.products (sku, name, slug, brand_id, category_id, description, specs, base_price, featured, status)
select
  'ANK-20W',
  'Anker 20W USB-C Charger',
  'anker-20w-charger',
  b.id,
  c.id,
  'Compact USB-C fast charger suitable for iPhone. A reliable everyday accessory kept in store stock.',
  '{"output":"20W USB-C","compatibility":"iPhone 8 and later"}'::jsonb,
  12500,
  false,
  'active'
from public.brands b, public.categories c
where b.slug = 'anker' and c.slug = 'accessories'
on conflict (slug) do nothing;

-- Variants
insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls, reservable, preorder_enabled)
select p.id, 'iPhone 15', '128GB', 'Blue', 'IP15-128-BLU', 450000,
  array['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80'],
  true, true
from public.products p where p.slug = 'iphone-15'
on conflict (sku) do nothing;

insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls)
select p.id, 'iPhone 15', '256GB', 'Black', 'IP15-256-BLK', 520000,
  array['https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&w=1200&q=80']
from public.products p where p.slug = 'iphone-15'
on conflict (sku) do nothing;

insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls)
select p.id, 'iPhone 15 Pro', '256GB', 'Natural Titanium', 'IP15P-256-NAT', 720000,
  array['https://images.unsplash.com/photo-1696425725876-0e60990a5d3d?auto=format&fit=crop&w=1200&q=80']
from public.products p where p.slug = 'iphone-15-pro'
on conflict (sku) do nothing;

insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls)
select p.id, 'iPhone 15 Pro', '512GB', 'Blue Titanium', 'IP15P-512-BLU', 860000,
  array['https://images.unsplash.com/photo-1696425725876-0e60990a5d3d?auto=format&fit=crop&w=1200&q=80']
from public.products p where p.slug = 'iphone-15-pro'
on conflict (sku) do nothing;

insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls)
select p.id, 'iPhone 14', '128GB', 'Midnight', 'IP14-128-MID', 320000,
  array['https://images.unsplash.com/photo-1678685888221-cda773a3dcdb?auto=format&fit=crop&w=1200&q=80']
from public.products p where p.slug = 'iphone-14'
on conflict (sku) do nothing;

insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls)
select p.id, 'AirPods Pro 2', null, 'White', 'APP2-WHT', 145000,
  array['https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=1200&q=80']
from public.products p where p.slug = 'airpods-pro-2'
on conflict (sku) do nothing;

insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls, reservable, preorder_enabled)
select p.id, 'Apple Watch Series 9', '41mm', 'Midnight', 'AW9-41-MID', 280000,
  array['https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?auto=format&fit=crop&w=1200&q=80'],
  true, true
from public.products p where p.slug = 'apple-watch-series-9'
on conflict (sku) do nothing;

insert into public.product_variants (product_id, model, storage, color, sku, price, image_urls)
select p.id, 'Anker 20W', null, 'White', 'ANK-20W-WHT', 12500,
  array['https://images.unsplash.com/photo-1583863788434-e43a8e7d0e3d?auto=format&fit=crop&w=1200&q=80']
from public.products p where p.slug = 'anker-20w-charger'
on conflict (sku) do nothing;

-- Starting stock (bypasses RPCs; seed only)
update public.inventory i
set total_stock = s.qty, min_stock = s.min
from (
  select v.id, s.qty, s.min
  from public.product_variants v
  join (values
    ('IP15-128-BLU', 8, 2),
    ('IP15-256-BLK', 4, 2),
    ('IP15P-256-NAT', 3, 1),
    ('IP15P-512-BLU', 1, 1),
    ('IP14-128-MID', 12, 3),
    ('APP2-WHT', 15, 3),
    ('AW9-41-MID', 0, 1),
    ('ANK-20W-WHT', 40, 5)
  ) as s(sku, qty, min) on s.sku = v.sku
) s
where i.variant_id = s.id;

-- Refresh official photos and FCFA prices on an already-seeded catalog.
-- Prices follow the manufacturer MSRP converted at 600 XAF per USD.
update public.product_variants v
set price = s.price, image_urls = array[s.image]
from (values
  ('IP15-128-BLU',   480000, '/products/iphone-15.jpg'),
  ('IP15-256-BLK',   540000, '/products/iphone-15.jpg'),
  ('IP15P-256-NAT',  660000, '/products/iphone-15-pro.jpg'),
  ('IP15P-512-BLU',  780000, '/products/iphone-15-pro.jpg'),
  ('IP14-128-MID',   360000, '/products/iphone-14.jpg'),
  ('APP2-WHT',       150000, '/products/airpods-pro-2.jpg'),
  ('AW9-41-MID',     240000, '/products/apple-watch-s9.jpg'),
  ('ANK-20W-WHT',      7500, '/products/anker-20w-charger.jpg')
) as s(sku, price, image)
where v.sku = s.sku;

update public.products p
set base_price = s.price
from (values
  ('IP15-BASE',         260000),
  ('IP15P-BASE',        340000),
  ('IP14-BASE',         200000),
  ('APP-AIRPODS-PRO2',  12000),
  ('AW9-BASE',          240000),
  ('ANK-20W',             7500)
) as s(sku, price)
where p.sku = s.sku;

update public.site_settings
set
  store_name = 'Stive Landry Store',
  tagline = 'iPhone & Electronics',
  phone = '+237 6 58 66 04 87',
  email = 'stivelandry16@gmail.com',
  address = 'Akwa Doubai, Douala, Cameroon',
  hours = 'Mon–Sat 9:00–19:00',
  whatsapp = '+237658660487',
  reservation_hold_hours = 48
where id = 1;