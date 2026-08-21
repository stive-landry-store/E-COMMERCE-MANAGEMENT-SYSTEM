-- Category card images for the home page.
-- Run AFTER 002_sellers.sql

alter table public.categories
  add column if not exists image_url text,
  add column if not exists sort_order integer not null default 0,
  add column if not exists show_on_home boolean not null default true;

-- Laptop / MacBook category
insert into public.categories (name, slug, description, image_url, sort_order, show_on_home, status)
values (
  'Laptop / MacBook',
  'laptop-macbook',
  'MacBook Air, MacBook Pro and premium laptops.',
  '/categories/macbook.jpg',
  10,
  true,
  'active'
)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = coalesce(public.categories.image_url, excluded.image_url),
  show_on_home = true;

update public.categories set image_url = '/categories/iphone.jpg', sort_order = 20, show_on_home = true where slug = 'iphone' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/audio.jpg', sort_order = 30, show_on_home = true where slug = 'audio' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/accessories.jpg', sort_order = 40, show_on_home = true where slug = 'accessories' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/wearables.jpg', sort_order = 50, show_on_home = true where slug = 'wearables' and (image_url is null or image_url = '');

-- Allow admin uploads into category-images folder of product-images bucket (already covered by admin policies)
-- Optional dedicated bucket for clarity
insert into storage.buckets (id, name, public)
values ('category-images', 'category-images', true)
on conflict (id) do nothing;

drop policy if exists "public read category images" on storage.objects;
create policy "public read category images"
on storage.objects for select
using (bucket_id = 'category-images');

drop policy if exists "admin write category images" on storage.objects;
create policy "admin write category images"
on storage.objects for insert
with check (bucket_id = 'category-images' and public.current_role() = 'admin');

drop policy if exists "admin update category images" on storage.objects;
create policy "admin update category images"
on storage.objects for update
using (bucket_id = 'category-images' and public.current_role() = 'admin');

drop policy if exists "admin delete category images" on storage.objects;
create policy "admin delete category images"
on storage.objects for delete
using (bucket_id = 'category-images' and public.current_role() = 'admin');
