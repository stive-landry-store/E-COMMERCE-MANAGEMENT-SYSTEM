-- Let principal admins create/edit digital services.
-- Auto-deliver credentials for any service except iCloud (not only Netflix/CapCut).

drop policy if exists digital_services_public_read on public.digital_services;
create policy digital_services_public_read on public.digital_services
  for select using (
    is_active = true
    or public.is_principal_admin()
    or public.is_staff()
  );

drop policy if exists digital_services_admin_all on public.digital_services;
create policy digital_services_admin_all on public.digital_services
  for all using (public.is_principal_admin())
  with check (public.is_principal_admin());

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
    if v_order.user_id is distinct from auth.uid() and not public.is_principal_admin() then
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
  else
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
      v_msg := 'Client paid but NO free account left in stock.'
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
      v_msg := 'Credentials auto-delivered to client.'
        || E'\nClient: ' || coalesce(v_order.customer_name, v_order.customer_email, 'n/a')
        || E'\nAmount: ' || v_amount || ' FCFA'
        || E'\nLogin: ' || v_cred.login_email
        || E'\nOrder: ' || left(v_order.id::text, 8);

      perform public.notify_staff_payment(v_title, v_msg, 'service_payment');
    end if;
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

grant execute on function public.confirm_service_payment(uuid, text) to authenticated;
