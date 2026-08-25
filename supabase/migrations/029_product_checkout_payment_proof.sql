-- Payment proof for product orders + service orders (screenshot + reference)
-- Also storage bucket payment-proofs

alter table public.orders
  add column if not exists payment_proof_path text,
  add column if not exists payment_reference text,
  add column if not exists payment_proof_submitted_at timestamptz,
  add column if not exists payment_account_id uuid references public.payment_accounts(id) on delete set null,
  add column if not exists destination_account text;

alter table public.service_orders
  add column if not exists payment_proof_path text,
  add column if not exists payment_reference text,
  add column if not exists payment_proof_submitted_at timestamptz;

-- Storage bucket for screenshots
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;

drop policy if exists "users upload own payment proofs" on storage.objects;
create policy "users upload own payment proofs"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'payment-proofs'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "users read own payment proofs" on storage.objects;
create policy "users read own payment proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'payment-proofs'
  and (
    split_part(name, '/', 1) = auth.uid()::text
    or public.current_role() in ('admin', 'co_admin', 'store_owner', 'sales_staff')
  )
);

create or replace function public.submit_order_payment_proof(
  p_order_id uuid,
  p_proof_path text,
  p_reference text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_proof_path is null or length(trim(p_proof_path)) < 3 then
    raise exception 'Payment screenshot required';
  end if;
  if p_reference is null or length(trim(p_reference)) < 4 then
    raise exception 'Transaction reference required';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'Order not found';
  end if;
  if v_order.profile_id is distinct from auth.uid() and public.current_role() <> 'admin' then
    raise exception 'Not allowed';
  end if;

  update public.orders
  set
    payment_proof_path = trim(p_proof_path),
    payment_reference = trim(p_reference),
    payment_proof_submitted_at = now(),
    payment_status = 'pending',
    updated_at = now()
  where id = v_order.id;

  update public.payments
  set status = 'pending'
  where order_id = v_order.id;

  perform public.notify_staff(
    'order',
    'Payment proof received',
    format(
      'Order %s — proof submitted.%sMethod: %s%sReference: %s%sAmount: %s FCFA',
      v_order.order_number,
      E'\n',
      coalesce(v_order.payment_method::text, '-'),
      E'\n',
      trim(p_reference),
      E'\n',
      trim(to_char(v_order.total, '999999999999'))
    )
  );
end;
$$;

create or replace function public.submit_service_payment_proof(
  p_order_id uuid,
  p_proof_path text,
  p_reference text,
  p_icloud_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.service_orders%rowtype;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_proof_path is null or length(trim(p_proof_path)) < 3 then
    raise exception 'Payment screenshot required';
  end if;
  if p_reference is null or length(trim(p_reference)) < 4 then
    raise exception 'Transaction reference required';
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

  update public.service_orders
  set
    payment_proof_path = trim(p_proof_path),
    payment_reference = trim(p_reference),
    payment_proof_submitted_at = now(),
    updated_at = now()
  where id = v_order.id;

  -- Deliver credentials / notify (same as previous confirm flow)
  v_result := public.confirm_service_payment(p_order_id, p_icloud_email);
  return v_result;
end;
$$;

grant execute on function public.submit_order_payment_proof(uuid, text, text) to authenticated;
grant execute on function public.submit_service_payment_proof(uuid, text, text, text) to authenticated;
