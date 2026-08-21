-- Digital services (Netflix, CapCut, iCloud…) + promotional flyers
-- Admin principal only for write; public can read active rows.

create table if not exists public.digital_services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  description text,
  logo_url text,
  accent_from text not null default '#ff7a45',
  accent_to text not null default '#ff2d95',
  price_monthly numeric(12,0) not null default 0,
  price_first_month numeric(12,0),
  currency text not null default 'FCFA',
  badge text,
  features jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_flyers (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.digital_services(id) on delete set null,
  title text not null,
  headline text,
  body text,
  logo_url text,
  image_url text,
  accent_from text not null default '#ff7a45',
  accent_to text not null default '#ff2d95',
  cta_label text default 'Commander',
  cta_url text,
  promo_code text,
  discount_percent numeric(5,2) default 0,
  show_on_services boolean not null default true,
  show_on_home boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_percent numeric(5,2) not null default 25,
  applies_to text not null default 'first_recharge',
  service_id uuid references public.digital_services(id) on delete set null,
  is_active boolean not null default true,
  max_uses int,
  used_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists digital_services_active_idx on public.digital_services (is_active, sort_order);
create index if not exists promo_flyers_active_idx on public.promo_flyers (is_active, show_on_services, sort_order);
create index if not exists promo_codes_code_idx on public.promo_codes (lower(code));

alter table public.digital_services enable row level security;
alter table public.promo_flyers enable row level security;
alter table public.promo_codes enable row level security;

drop policy if exists digital_services_public_read on public.digital_services;
create policy digital_services_public_read on public.digital_services
  for select using (is_active = true or public.current_role() = 'admin');

drop policy if exists digital_services_admin_all on public.digital_services;
create policy digital_services_admin_all on public.digital_services
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists promo_flyers_public_read on public.promo_flyers;
create policy promo_flyers_public_read on public.promo_flyers
  for select using (
    (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.current_role() = 'admin'
  );

drop policy if exists promo_flyers_admin_all on public.promo_flyers;
create policy promo_flyers_admin_all on public.promo_flyers
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists promo_codes_public_read on public.promo_codes;
create policy promo_codes_public_read on public.promo_codes
  for select using (is_active = true or public.current_role() = 'admin');

drop policy if exists promo_codes_admin_all on public.promo_codes;
create policy promo_codes_admin_all on public.promo_codes
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

grant select on public.digital_services to anon, authenticated;
grant select on public.promo_flyers to anon, authenticated;
grant select on public.promo_codes to anon, authenticated;
grant all on public.digital_services to authenticated;
grant all on public.promo_flyers to authenticated;
grant all on public.promo_codes to authenticated;

-- Seed flagship offers
insert into public.digital_services (slug, name, subtitle, description, logo_url, accent_from, accent_to, price_monthly, price_first_month, badge, features, sort_order)
values
  (
    'netflix-premium',
    'Netflix Premium',
    'Réabonnement mensuel',
    'Profitez de Netflix Premium (4K Ultra HD, jusqu''à 4 écrans) via Stive Landry Store. Premier mois à tarif préférentiel, puis tarif standard.',
    '/services/netflix.png',
    '#e50914',
    '#b20710',
    2500,
    2000,
    'Premium 4K',
    '["Compte Premium","Qualité 4K Ultra HD","Jusqu''à 4 écrans","Activation rapide"]'::jsonb,
    10
  ),
  (
    'capcut-pro',
    'CapCut Pro',
    'Réabonnement mensuel',
    'Débloquez CapCut Pro pour monter vos vidéos sans filigrane, avec effets pro et exports haute qualité.',
    '/services/capcut.png',
    '#00c2ff',
    '#7b61ff',
    2500,
    null,
    'Pro',
    '["Sans filigrane","Effets Pro","Export HD","Idéal créateurs"]'::jsonb,
    20
  ),
  (
    'icloud',
    'iCloud',
    'Pour iPhone & Apple',
    'Réabonnement iCloud pour sécuriser vos photos, sauvegardes iPhone et fichiers — simple et mensuel.',
    '/services/icloud.png',
    '#3b82f6',
    '#8b5cf6',
    3000,
    null,
    'Apple',
    '["Sauvegarde iPhone","Photos & fichiers","Synchronisation","Prix fixe / mois"]'::jsonb,
    30
  )
on conflict (slug) do update set
  name = excluded.name,
  subtitle = excluded.subtitle,
  description = excluded.description,
  logo_url = excluded.logo_url,
  accent_from = excluded.accent_from,
  accent_to = excluded.accent_to,
  price_monthly = excluded.price_monthly,
  price_first_month = excluded.price_first_month,
  badge = excluded.badge,
  features = excluded.features,
  sort_order = excluded.sort_order,
  is_active = true,
  updated_at = now();

insert into public.promo_codes (code, description, discount_percent, applies_to, is_active)
values
  ('STIVELANDRY16STORE', '−25% sur la première recharge (tous services)', 25, 'first_recharge', true)
on conflict (code) do update set
  description = excluded.description,
  discount_percent = excluded.discount_percent,
  applies_to = excluded.applies_to,
  is_active = true;

-- Flyer cards linked to services
insert into public.promo_flyers (
  service_id, title, headline, body, logo_url, accent_from, accent_to,
  cta_label, promo_code, discount_percent, show_on_services, show_on_home, sort_order, is_active
)
select s.id,
  case s.slug
    when 'netflix-premium' then 'Netflix Premium'
    when 'capcut-pro' then 'CapCut Pro'
    else 'iCloud'
  end,
  case s.slug
    when 'netflix-premium' then '1er mois à 2 000 FCFA'
    when 'capcut-pro' then 'Seulement 2 500 FCFA / mois'
    else 'Seulement 3 000 FCFA / mois'
  end,
  case s.slug
    when 'netflix-premium' then 'Puis 2 500 FCFA / mois. Code STIVELANDRY16STORE = −25% sur ta première recharge.'
    when 'capcut-pro' then 'Montage pro sans filigrane. Code STIVELANDRY16STORE = −25% sur ta première recharge.'
    else 'Sauvegarde iPhone en toute sérénité. Code STIVELANDRY16STORE = −25% sur ta première recharge.'
  end,
  s.logo_url, s.accent_from, s.accent_to,
  'Je m''abonne',
  'STIVELANDRY16STORE',
  25,
  true,
  true,
  s.sort_order,
  true
from public.digital_services s
where s.slug in ('netflix-premium', 'capcut-pro', 'icloud')
  and not exists (
    select 1 from public.promo_flyers f where f.service_id = s.id and f.title = s.name
  );
