-- Per-country Mobile Money USSD routes (auto-dial: phone then amount, no +237 in CM codes).
-- Client only enters secret PIN after the dialer opens.

alter table public.payment_accounts
  add column if not exists sender_country text not null default 'Cameroon',
  add column if not exists phone_format text not null default 'local';

alter table public.payment_accounts
  drop constraint if exists payment_accounts_method_key;

create unique index if not exists payment_accounts_method_country_idx
  on public.payment_accounts (method, sender_country);

alter table public.payment_accounts
  drop constraint if exists payment_accounts_phone_format_check;

alter table public.payment_accounts
  add constraint payment_accounts_phone_format_check
  check (phone_format in ('local', 'international_237'));

-- Cameroon (local number 658660487 in USSD)
insert into public.payment_accounts (method, sender_country, label, account_number, account_name, ussd_template, phone_format, instructions, sort_order)
values
  (
    'orange_money',
    'Cameroon',
    'Orange Money',
    '658660487',
    'Stive Landry Store',
    '#150*1*1*{phone}*{amount}#',
    'local',
    'Le paiement s''ouvre automatiquement. Entrez seulement votre code secret Orange Money.',
    10
  ),
  (
    'mtn_momo',
    'Cameroon',
    'MTN MoMo',
    '658660487',
    'Stive Landry Store',
    '*126*1*1*{phone}*{amount}#',
    'local',
    'Le paiement s''ouvre automatiquement. Entrez seulement votre code secret MoMo.',
    20
  )
on conflict (method, sender_country) do update set
  account_number = excluded.account_number,
  ussd_template = excluded.ussd_template,
  phone_format = excluded.phone_format,
  instructions = excluded.instructions,
  label = excluded.label,
  is_active = true,
  updated_at = now();

-- CEMAC neighbours → Orange/MTN Cameroon (237 prefix baked in template, local dest in DB)
insert into public.payment_accounts (method, sender_country, label, account_number, account_name, ussd_template, phone_format, instructions, sort_order)
values
  ('orange_money', 'Gabon', 'Orange Money (Gabon → Cameroun)', '658660487', 'Stive Landry Store', '#144*1*237{phone}*{amount}#', 'local', 'Transfert international Orange vers le Cameroun. Entrez votre code secret.', 11),
  ('mtn_momo', 'Gabon', 'MTN MoMo (Gabon → Cameroun)', '658660487', 'Stive Landry Store', '*133*1*237{phone}*{amount}#', 'local', 'Transfert MTN vers le Cameroun. Entrez votre code secret.', 21),
  ('orange_money', 'Congo', 'Orange Money (Congo → Cameroun)', '658660487', 'Stive Landry Store', '#144*1*237{phone}*{amount}#', 'local', 'Transfert Orange vers le Cameroun.', 12),
  ('mtn_momo', 'Congo', 'MTN MoMo (Congo → Cameroun)', '658660487', 'Stive Landry Store', '*133*1*237{phone}*{amount}#', 'local', 'Transfert MTN vers le Cameroun.', 22),
  ('orange_money', 'Chad', 'Orange Money (Tchad → Cameroun)', '658660487', 'Stive Landry Store', '#144*1*237{phone}*{amount}#', 'local', 'Transfert Orange vers le Cameroun.', 13),
  ('mtn_momo', 'Chad', 'MTN MoMo (Tchad → Cameroun)', '658660487', 'Stive Landry Store', '*133*1*237{phone}*{amount}#', 'local', 'Transfert MTN vers le Cameroun.', 23),
  ('orange_money', 'Central African Republic', 'Orange Money (RCA → Cameroun)', '658660487', 'Stive Landry Store', '#144*1*237{phone}*{amount}#', 'local', 'Transfert Orange vers le Cameroun.', 14),
  ('mtn_momo', 'Central African Republic', 'MTN MoMo (RCA → Cameroun)', '658660487', 'Stive Landry Store', '*133*1*237{phone}*{amount}#', 'local', 'Transfert MTN vers le Cameroun.', 24),
  ('orange_money', 'Equatorial Guinea', 'Orange Money (Guinée Eq. → Cameroun)', '658660487', 'Stive Landry Store', '#144*1*237{phone}*{amount}#', 'local', 'Transfert Orange vers le Cameroun.', 15),
  ('mtn_momo', 'Equatorial Guinea', 'MTN MoMo (Guinée Eq. → Cameroun)', '658660487', 'Stive Landry Store', '*133*1*237{phone}*{amount}#', 'local', 'Transfert MTN vers le Cameroun.', 25)
on conflict (method, sender_country) do update set
  ussd_template = excluded.ussd_template,
  phone_format = excluded.phone_format,
  instructions = excluded.instructions,
  label = excluded.label,
  account_number = excluded.account_number,
  is_active = true,
  updated_at = now();

-- Fix legacy rows missing sender_country
update public.payment_accounts
set sender_country = 'Cameroon', updated_at = now()
where sender_country is null or trim(sender_country) = '';

update public.payment_accounts
set
  ussd_template = '#150*1*1*{phone}*{amount}#',
  phone_format = 'local',
  updated_at = now()
where method = 'orange_money' and sender_country = 'Cameroon';

update public.payment_accounts
set
  ussd_template = '*126*1*1*{phone}*{amount}#',
  phone_format = 'local',
  updated_at = now()
where method = 'mtn_momo' and sender_country = 'Cameroon';
