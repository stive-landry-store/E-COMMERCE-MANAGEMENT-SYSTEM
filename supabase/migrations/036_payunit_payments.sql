-- Payunit: mark product/service orders paid from the webhook (service role only).

create or replace function public.confirm_service_payment(
  p_order_id uuid,
  p_icloud_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.service_orders%rowtype;
  v_cred public.service_credentials%rowtype;
  v_slug text;
  v_amount text;
  v_msg text;
  v_title text;
  v_service_role boolean := auth.role() = 'service_role';
begin
  if not v_service_role then
    if auth.uid() is null then
      raise exception 'Not authenticated';
    end if;
  end if;

  select * into v_order
  from public.service_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if not v_service_role then
    if v_order.user_id is distinct from auth.uid() and public.current_role() <> 'admin' then
      raise exception 'Not allowed';
    end if;
  end if;

  if v_order.status in ('delivered', 'fulfilled', 'payment_confirmed') and v_order.payment_confirmed_at is not null then
    return jsonb_build_object(
      'order_id', v_order.id,
      'status', v_order.status,
      'service_slug', v_order.service_slug,
      'delivered_login', v_order.delivered_login,
      'delivered_password', v_order.delivered_password,
      'customer_icloud_email', v_order.customer_icloud_email,
      'amount', v_order.amount
    );
  end if;

  v_slug := coalesce(v_order.service_slug, '');
  v_amount := trim(to_char(v_order.amount, '999999999999'));

  if v_slug = 'icloud' then
    if coalesce(p_icloud_email, v_order.customer_icloud_email, '') = '' or length(trim(coalesce(p_icloud_email, v_order.customer_icloud_email, ''))) < 3 then
      raise exception 'iCloud email required';
    end if;

    update public.service_orders
    set
      status = 'awaiting_manual_activation',
      customer_icloud_email = trim(coalesce(p_icloud_email, customer_icloud_email)),
      payment_confirmed_at = now(),
      admin_notified_at = now(),
      updated_at = now()
    where id = v_order.id
    returning * into v_order;

    v_title := 'iCloud payment — ' || v_amount || ' FCFA';
    v_msg := 'Client: ' || coalesce(v_order.customer_name, v_order.customer_email, 'n/a')
      || E'\nAmount: ' || v_amount || ' FCFA'
      || E'\nMethod: Payunit'
      || E'\niCloud: ' || v_order.customer_icloud_email
      || E'\nOrder: ' || left(v_order.id::text, 8);

    perform public.notify_staff_payment(v_title, v_msg, 'icloud_payment');

  elsif v_slug in ('netflix-premium', 'capcut-pro') then
    select * into v_cred
    from public.service_credentials
    where service_slug = v_slug
      and is_active = true
      and is_assigned = false
    order by created_at
    for update skip locked
    limit 1;

    if not found then
      update public.service_orders
      set
        status = 'awaiting_credentials',
        payment_confirmed_at = now(),
        admin_notified_at = now(),
        updated_at = now()
      where id = v_order.id
      returning * into v_order;

      v_title := v_order.service_name || ' payment — ' || v_amount || ' FCFA';
      v_msg := 'Client paid via Payunit but NO free account left in stock.'
        || E'\nClient: ' || coalesce(v_order.customer_name, v_order.customer_email, 'n/a')
        || E'\nAmount: ' || v_amount || ' FCFA'
        || E'\nOrder: ' || left(v_order.id::text, 8)
        || E'\nAdd credentials in Admin → Digital accounts.';

      perform public.notify_staff_payment(v_title, v_msg, 'service_payment_nostock');
    else
      update public.service_credentials
      set
        is_assigned = true,
        assigned_order_id = v_order.id,
        assigned_at = now(),
        updated_at = now()
      where id = v_cred.id;

      update public.service_orders
      set
        status = 'delivered',
        credential_id = v_cred.id,
        delivered_login = v_cred.login_email,
        delivered_password = v_cred.login_password,
        payment_confirmed_at = now(),
        admin_notified_at = now(),
        updated_at = now()
      where id = v_order.id
      returning * into v_order;

      v_title := v_order.service_name || ' paid — ' || v_amount || ' FCFA';
      v_msg := 'Payunit payment. Credentials auto-delivered to client.'
        || E'\nClient: ' || coalesce(v_order.customer_name, v_order.customer_email, 'n/a')
        || E'\nAmount: ' || v_amount || ' FCFA'
        || E'\nLogin: ' || v_cred.login_email
        || E'\nOrder: ' || left(v_order.id::text, 8);

      perform public.notify_staff_payment(v_title, v_msg, 'service_payment');
    end if;
  else
    update public.service_orders
    set
      status = 'payment_confirmed',
      payment_confirmed_at = now(),
      admin_notified_at = now(),
      updated_at = now()
    where id = v_order.id
    returning * into v_order;

    v_title := 'Service payment — ' || v_amount || ' FCFA';
    v_msg := coalesce(v_order.service_name, 'Service')
      || E'\nAmount: ' || v_amount || ' FCFA'
      || E'\nClient: ' || coalesce(v_order.customer_name, v_order.customer_email, 'n/a')
      || E'\nMethod: Payunit'
      || E'\nOrder: ' || left(v_order.id::text, 8);

    perform public.notify_staff_payment(v_title, v_msg, 'service_payment');
  end if;

  return jsonb_build_object(
    'order_id', v_order.id,
    'status', v_order.status,
    'service_slug', v_order.service_slug,
    'delivered_login', v_order.delivered_login,
    'delivered_password', v_order.delivered_password,
    'customer_icloud_email', v_order.customer_icloud_email,
    'amount', v_order.amount
  );
end;
$$;

create or replace function public.apply_payunit_success(p_transaction_id text, p_gateway text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_svc public.service_orders%rowtype;
begin
  if p_transaction_id is null or length(btrim(p_transaction_id)) < 4 then
    raise exception 'Missing transaction id';
  end if;

  select * into v_order
  from public.orders
  where payment_reference = btrim(p_transaction_id)
  order by created_at desc
  limit 1
  for update;

  if found then
    update public.orders
    set
      payment_status = 'paid',
      order_status = case when order_status = 'pending' then 'confirmed' else order_status end,
      payment_proof_submitted_at = coalesce(payment_proof_submitted_at, now())
    where id = v_order.id;

    update public.payments
    set
      status = 'paid',
      provider = 'payunit',
      provider_ref = coalesce(nullif(btrim(p_gateway), ''), provider_ref, btrim(p_transaction_id))
    where order_id = v_order.id;

    return jsonb_build_object('ok', true, 'kind', 'product', 'id', v_order.id);
  end if;

  select * into v_svc
  from public.service_orders
  where payment_reference = btrim(p_transaction_id)
  order by created_at desc
  limit 1
  for update;

  if not found then
    raise exception 'Unknown Payunit transaction';
  end if;

  return public.confirm_service_payment(v_svc.id, v_svc.customer_icloud_email);
end;
$$;

revoke all on function public.apply_payunit_success(text, text) from public, anon, authenticated;
grant execute on function public.apply_payunit_success(text, text) to service_role;
grant execute on function public.confirm_service_payment(uuid, text) to authenticated;
