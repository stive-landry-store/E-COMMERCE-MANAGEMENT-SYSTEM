-- Ensure EVERY product variant has MORE THAN 37 pieces AVAILABLE
-- (available = total_stock - reserved_stock > 37, i.e. at least 38)
-- Only adds the missing quantity. Notifies main admin for each restock.

create or replace function public.notify_main_admin(
  p_type text,
  p_title text,
  p_message text,
  p_action_path text default null
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
    coalesce(p_action_path, '/console/inventory')
  from public.profiles
  where role = 'admin'
    and status = 'active';
end;
$$;

-- Create inventory for any missing variants
insert into public.inventory (variant_id, total_stock, reserved_stock, min_stock)
select v.id, 0, 0, 2
from public.product_variants v
where not exists (select 1 from public.inventory i where i.variant_id = v.id);

-- Bring every variant to at least 38 available (> 37)
do $$
declare
  r record;
  v_available integer;
  v_need integer;
  v_target_available integer := 38; -- strictly more than 37
  v_new_total integer;
begin
  for r in
    select
      i.variant_id,
      i.total_stock,
      i.reserved_stock,
      p.name as product_name,
      coalesce(
        nullif(trim(both ' ' from concat_ws(' · ', v.color, v.storage, v.model)), ''),
        'standard'
      ) as variant_label
    from public.inventory i
    join public.product_variants v on v.id = i.variant_id
    join public.products p on p.id = v.product_id
  loop
    v_available := greatest(r.total_stock - r.reserved_stock, 0);
    v_need := v_target_available - v_available;

    -- Already has more than 37 available → skip
    if v_need <= 0 then
      continue;
    end if;

    v_new_total := r.total_stock + v_need;

    update public.inventory
    set total_stock = v_new_total,
        updated_at = now()
    where variant_id = r.variant_id;

    insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
    values (
      r.variant_id,
      'add'::public.stock_movement_type,
      v_need,
      format('Ensure available stock > 37 (was %s available, added %s)', v_available, v_need),
      null
    );

    perform public.notify_main_admin(
      'inventory',
      'Stock restocked',
      format(
        '“%s” · %s : +%s pièces. Disponible : %s → %s.',
        r.product_name,
        r.variant_label,
        v_need,
        v_available,
        v_available + v_need
      ),
      '/console/inventory'
    );
  end loop;
end;
$$;

-- Future add_stock still notifies main admin
create or replace function public.add_stock(p_variant_id uuid, p_quantity integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_label text;
  v_new_total integer;
begin
  if not public.can_write_variant_stock(p_variant_id) then
    raise exception 'Not authorized to add stock';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  perform public.ensure_inventory(p_variant_id);

  update public.inventory
  set total_stock = total_stock + p_quantity,
      updated_at = now()
  where variant_id = p_variant_id
  returning total_stock into v_new_total;

  insert into public.stock_movements (variant_id, type, quantity, reason, recorded_by)
  values (p_variant_id, 'add', p_quantity, coalesce(p_reason, 'Stock added'), auth.uid());

  select
    p.name,
    coalesce(nullif(trim(both ' ' from concat_ws(' · ', v.color, v.storage, v.model)), ''), 'standard')
  into v_name, v_label
  from public.product_variants v
  join public.products p on p.id = v.product_id
  where v.id = p_variant_id;

  perform public.notify_main_admin(
    'inventory',
    'Stock added',
    format(
      '+%s ajouté à “%s” · %s. Nouveau total : %s.',
      p_quantity,
      coalesce(v_name, 'Produit'),
      v_label,
      v_new_total
    ),
    '/console/inventory'
  );

  perform public.write_audit(
    'add_stock',
    'inventory',
    p_variant_id::text,
    jsonb_build_object('quantity', p_quantity, 'reason', p_reason)
  );
end;
$$;

grant execute on function public.notify_main_admin(text, text, text, text) to authenticated;
grant execute on function public.add_stock(uuid, integer, text) to authenticated;
