-- Notification deep links + co-admin receives staff alerts

alter table public.notifications
  add column if not exists action_path text;

create or replace function public.notification_action_path(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'seller' then '/console/sellers?tab=pending'
    when 'order' then '/console/orders'
    when 'reservation' then '/console/reservations'
    when 'preorder' then '/console/preorders'
    when 'service_payment' then '/console/digital-accounts?tab=orders'
    when 'service_payment_nostock' then '/console/digital-accounts?tab=orders'
    when 'icloud_payment' then '/console/digital-accounts?tab=orders'
    else null
  end;
$$;

create or replace function public.notify_staff(
  p_type text,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, action_path)
  select
    id,
    p_type,
    p_title,
    p_message,
    coalesce(public.notification_action_path(p_type), '/console/notifications')
  from public.profiles
  where role in ('admin', 'co_admin', 'inventory_manager', 'sales_staff', 'store_owner')
    and status = 'active';
end;
$$;

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
  insert into public.notifications (user_id, type, title, message, action_path)
  select
    p.id,
    p_type,
    p_title,
    p_message,
    coalesce(public.notification_action_path(p_type), '/console/digital-accounts?tab=orders')
  from public.profiles p
  where p.role in ('admin', 'co_admin', 'store_owner')
    and p.status = 'active';
end;
$$;

grant execute on function public.notification_action_path(text) to authenticated;
