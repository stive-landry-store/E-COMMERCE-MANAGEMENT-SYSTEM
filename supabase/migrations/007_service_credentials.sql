-- Service account credentials delivery + payment confirmation notifications

alter table public.service_orders
  add column if not exists customer_icloud_email text,
  add column if not exists delivered_login text,
  add column if not exists delivered_password text,
  add column if not exists credential_id uuid,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists admin_notified_at timestamptz;

create table if not exists public.service_credentials (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  login_email text not null,
  login_password text not null,
  label text,
  notes text,
  is_active boolean not null default true,
  is_assigned boolean not null default false,
  assigned_order_id uuid references public.service_orders(id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_credentials_slug_check check (
    service_slug in ('netflix-premium', 'capcut-pro', 'icloud')
  )
);

create index if not exists service_credentials_pool_idx
  on public.service_credentials (service_slug, is_active, is_assigned);

alter table public.service_orders
  drop constraint if exists service_orders_credential_fk;
alter table public.service_orders
  add constraint service_orders_credential_fk
  foreign key (credential_id) references public.service_credentials(id) on delete set null;

alter table public.service_credentials enable row level security;

drop policy if exists service_credentials_admin_all on public.service_credentials;
create policy service_credentials_admin_all on public.service_credentials
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

-- Customers may read credentials only via their own delivered order fields (not the pool table)
grant select, insert, update, delete on public.service_credentials to authenticated;

-- Allow customer to update own order for payment confirm fields (RPC preferred)
drop policy if exists service_orders_own_update on public.service_orders;
create policy service_orders_own_update on public.service_orders
  for update using (
    user_id = auth.uid() or public.current_role() = 'admin'
  )
  with check (
    user_id = auth.uid() or public.current_role() = 'admin'
  );

-- Notify all admins / store owners
create or replace function public.notify_staff_payment(
  p_title text,
  p_message text,
  p_type text default 'service_payment'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message)
  select p.id, p_type, p_title, p_message
  from public.profiles p
  where p.role in ('admin', 'store_owner')
    and p.status = 'active';
end;
$$;

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
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_order
  from public.service_orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;

  if v_order.user_id is distinct from auth.uid() and public.current_role() <> 'admin' then
    raise exception 'Not allowed';
  end if;

  if v_order.status in ('delivered', 'fulfilled', 'payment_confirmed') and v_order.payment_confirmed_at is not null then
    -- idempotent return
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
    if p_icloud_email is null or length(trim(p_icloud_email)) < 3 then
      raise exception 'iCloud email required';
    end if;

    update public.service_orders
    set
      status = 'awaiting_manual_activation',
      customer_icloud_email = trim(p_icloud_email),
      payment_confirmed_at = now(),
      admin_notified_at = now(),
      updated_at = now()
    where id = v_order.id
    returning * into v_order;

    v_title := 'iCloud payment — ' || v_amount || ' FCFA';
    v_msg := 'Client: ' || coalesce(v_order.customer_name, v_order.customer_email, 'n/a')
      || E'\nAmount: ' || v_amount || ' FCFA'
      || E'\nMethod: ' || coalesce(v_order.payment_method, '-')
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
      v_msg := 'Client paid but NO free account left in stock.'
        || E'\nClient: ' || coalesce(v_order.customer_name, v_order.customer_email, 'n/a')
        || E'\nAmount: ' || v_amount || ' FCFA'
        || E'\nMethod: ' || coalesce(v_order.payment_method, '-')
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
        || E'\nMethod: ' || coalesce(v_order.payment_method, '-')
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

grant execute on function public.notify_staff_payment(text, text, text) to authenticated;
grant execute on function public.confirm_service_payment(uuid, text) to authenticated;

-- Product checkout: also notify staff with clear amount when order total is set
create or replace function public.trg_orders_notify_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE'
     and coalesce(OLD.total, 0) = 0
     and coalesce(NEW.total, 0) > 0 then
    perform public.notify_staff(
      'order',
      'New order — ' || trim(to_char(NEW.total, 'FM999999999999')) || ' FCFA',
      'Order ' || NEW.order_number
        || E'\nAmount: ' || trim(to_char(NEW.total, 'FM999999999999')) || ' FCFA'
        || E'\nPayment: ' || coalesce(NEW.payment_method::text, '-')
    );
  end if;
  return NEW;
end;
$$;

drop trigger if exists orders_notify_amount on public.orders;
create trigger orders_notify_amount
  after update of total on public.orders
  for each row
  execute function public.trg_orders_notify_amount();
