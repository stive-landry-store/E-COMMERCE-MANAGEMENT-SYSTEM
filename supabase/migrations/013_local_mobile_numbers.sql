-- Store Orange/MTN numbers as local digits only (658660487), not +237658660487.
-- USSD dial codes on Cameroon phones expect the number without country code.

update public.payment_accounts
set
  account_number = case
    when left(regexp_replace(account_number, '\D', '', 'g'), 3) = '237'
      and length(regexp_replace(account_number, '\D', '', 'g')) >= 12
    then substring(regexp_replace(account_number, '\D', '', 'g') from 4)
    when left(regexp_replace(account_number, '\D', '', 'g'), 1) = '0'
      and length(regexp_replace(account_number, '\D', '', 'g')) = 10
    then substring(regexp_replace(account_number, '\D', '', 'g') from 2)
    else regexp_replace(account_number, '\D', '', 'g')
  end,
  updated_at = now()
where method in ('orange_money', 'mtn_momo');
