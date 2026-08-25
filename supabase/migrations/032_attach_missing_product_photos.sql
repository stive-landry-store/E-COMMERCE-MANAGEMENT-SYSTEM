-- 032: Attach local Ultra HD product photos for previously missing items
-- Files live in public/products/{slug}.png

update public.product_variants v
set image_urls = array['/products/' || p.slug || '.png?v=uhd1']
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

-- Also fix any active variant whose image_urls is empty but a product slug photo exists pattern
-- (kept scoped to these known fills to avoid overwriting seller custom photos)
