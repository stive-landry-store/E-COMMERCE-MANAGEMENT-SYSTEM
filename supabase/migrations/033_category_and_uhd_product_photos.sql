-- 033: Category Ultra HD cover photos + re-attach product photos (cache bust)
-- Files: public/categories/{slug}.jpg and public/products/{slug}.png

update public.categories
set
  image_url = '/categories/android-phones.jpg?v=uhd2',
  show_on_home = true,
  status = 'active',
  sort_order = 15
where slug = 'android-phones';

update public.categories
set
  image_url = '/categories/tablets.jpg?v=uhd2',
  show_on_home = true,
  status = 'active',
  sort_order = 45
where slug = 'tablets';

update public.categories
set image_url = '/categories/mac-desktop.jpg?v=uhd2'
where slug in ('mac-desktop', 'mac');

-- Also refresh other home covers if empty
update public.categories set image_url = '/categories/iphone.jpg?v=uhd2' where slug = 'iphone' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/macbook.jpg?v=uhd2' where slug = 'laptop-macbook' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/audio.jpg?v=uhd2' where slug = 'audio' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/accessories.jpg?v=uhd2' where slug = 'accessories' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/wearables.jpg?v=uhd2' where slug = 'wearables' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/ipad.jpg?v=uhd2' where slug = 'ipad' and (image_url is null or image_url = '');
update public.categories set image_url = '/categories/tablets.jpg?v=uhd2' where slug = 'ipad' and (image_url is null or image_url = '');

-- Ensure product variants point to the refreshed Ultra HD files
update public.product_variants v
set image_urls = array['/products/' || p.slug || '.png?v=uhd2']
from public.products p
where v.product_id = p.id
  and p.slug in (
    'google-pixel-8',
    'google-pixel-8a',
    'google-pixel-8-pro',
    'samsung-galaxy-s21-ultra',
    'samsung-galaxy-s23-ultra',
    'samsung-galaxy-s25-ultra',
    'samsung-galaxy-tab-s5e',
    'ipad-air-2',
    'ipad-6th-generation',
    'apple-watch-series-9'
  );
