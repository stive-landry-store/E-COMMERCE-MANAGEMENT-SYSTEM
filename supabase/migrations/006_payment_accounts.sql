-- Payment destination accounts (admin-managed) + service subscription orders
-- Orange Money default: 658660487 (local, no +237 in USSD)

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  method text not null unique,
  label text not null,
  account_number text not null,
  account_name text,
  bank_name text,
  ussd_template text,
  instructions text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_accounts_method_check check (
    method in ('orange_money', 'mtn_momo', 'credit_card', 'paypal', 'apple_pay', 'google_pay', 'cash_on_pickup')
  )
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  service_id uuid references public.digital_services(id) on delete set null,
  service_slug text,
  service_name text not null,
  amount numeric(12,0) not null,
  original_amount numeric(12,0) not null,
  promo_code text,
  discount_percent numeric(5,2) default 0,
  payment_method text not null,
  payment_account_id uuid references public.payment_accounts(id) on delete set null,
  destination_account text,
  status text not null default 'pending_payment',
  customer_phone text,
  customer_email text,
  customer_name text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_orders_user_idx on public.service_orders (user_id, created_at desc);
create index if not exists payment_accounts_active_idx on public.payment_accounts (is_active, sort_order);

alter table public.payment_accounts enable row level security;
alter table public.service_orders enable row level security;

drop policy if exists payment_accounts_public_read on public.payment_accounts;
create policy payment_accounts_public_read on public.payment_accounts
  for select using (is_active = true or public.current_role() = 'admin');

drop policy if exists payment_accounts_admin_all on public.payment_accounts;
create policy payment_accounts_admin_all on public.payment_accounts
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists service_orders_own_read on public.service_orders;
create policy service_orders_own_read on public.service_orders
  for select using (
    user_id = auth.uid() or public.current_role() = 'admin'
  );

drop policy if exists service_orders_insert on public.service_orders;
create policy service_orders_insert on public.service_orders
  for insert with check (
    auth.uid() is not null and (user_id is null or user_id = auth.uid())
  );

drop policy if exists service_orders_admin_update on public.service_orders;
create policy service_orders_admin_update on public.service_orders
  for update using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

grant select on public.payment_accounts to anon, authenticated;
grant all on public.payment_accounts to authenticated;
grant select, insert on public.service_orders to authenticated;
grant all on public.service_orders to authenticated;

-- Default payment destinations
insert into public.payment_accounts (method, label, account_number, account_name, ussd_template, instructions, sort_order)
values
  (
    'orange_money',
    'Orange Money',
    '658660487',
    'Stive Landry Store',
    '#150*1*1*{phone}*{amount}#',
    'Tap the button to open Orange Money transfer. Confirm the amount, then enter your PIN on your phone.',
    10
  ),
  (
    'mtn_momo',
    'MTN MoMo',
    '658660487',
    'Stive Landry Store',
    '*126*1*1*{phone}*{amount}#',
    'Tap the button to open MTN MoMo transfer. Confirm on your phone with your PIN.',
    20
  ),
  (
    'credit_card',
    'Bank / Debit card transfer',
    'TO_BE_SET_BY_ADMIN',
    'Stive Landry Store',
    null,
    'Transfer the exact amount to the bank account shown. Use your order reference as the payment note, then contact the store with the receipt.',
    30
  )
on conflict (method) do update set
  label = excluded.label,
  account_number = excluded.account_number,
  account_name = excluded.account_name,
  ussd_template = excluded.ussd_template,
  instructions = excluded.instructions,
  is_active = true,
  updated_at = now();

-- Logos + promo code update
update public.digital_services set logo_url = '/services/netflix.png', updated_at = now() where slug = 'netflix-premium';
update public.digital_services set logo_url = '/services/capcut.png', updated_at = now() where slug = 'capcut-pro';
update public.digital_services set logo_url = '/services/icloud.png', updated_at = now() where slug = 'icloud';

update public.promo_flyers set logo_url = '/services/netflix.png', promo_code = 'STIVELANDRY16STORE', updated_at = now()
where service_id in (select id from public.digital_services where slug = 'netflix-premium');
update public.promo_flyers set logo_url = '/services/capcut.png', promo_code = 'STIVELANDRY16STORE', updated_at = now()
where service_id in (select id from public.digital_services where slug = 'capcut-pro');
update public.promo_flyers set logo_url = '/services/icloud.png', promo_code = 'STIVELANDRY16STORE', updated_at = now()
where service_id in (select id from public.digital_services where slug = 'icloud');

insert into public.promo_codes (code, description, discount_percent, applies_to, is_active)
values ('STIVELANDRY16STORE', '−25% on first recharge', 25, 'first_recharge', true)
on conflict (code) do update set
  description = excluded.description,
  discount_percent = 25,
  is_active = true;

-- Keep old code inactive optional
update public.promo_codes set is_active = false where code = 'WELCOME25';
