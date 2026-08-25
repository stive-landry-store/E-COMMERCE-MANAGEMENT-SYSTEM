-- Correct payment destination number: +237658660487 (not 787)

update public.payment_accounts
set
  account_number = '+237658660487',
  updated_at = now()
where account_number in ('+237658660787', '237658660787', '+237 658 660 787');

update public.payment_accounts
set
  account_number = '+237658660487',
  updated_at = now()
where method in ('orange_money', 'mtn_momo')
  and account_number <> '+237658660487';
