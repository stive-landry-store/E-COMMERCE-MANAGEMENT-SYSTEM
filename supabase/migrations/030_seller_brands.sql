-- Sellers can create their own product brands

alter table public.brands
  add column if not exists seller_id uuid references public.sellers (id) on delete set null;

create index if not exists brands_seller_idx on public.brands (seller_id);

drop policy if exists "staff write brands" on public.brands;
drop policy if exists brands_staff_write on public.brands;
drop policy if exists brands_seller_insert on public.brands;

create policy brands_admin_write on public.brands
  for all
  using (public.is_admin_like())
  with check (public.is_admin_like());

create policy brands_seller_insert on public.brands
  for insert
  to authenticated
  with check (
    public.current_seller_id() is not null
    and (seller_id is null or seller_id = public.current_seller_id())
  );

create or replace function public.seller_create_brand(p_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_slug text;
  v_id uuid;
  v_seller uuid;
begin
  v_name := btrim(coalesce(p_name, ''));
  if length(v_name) < 2 then
    raise exception 'Brand name is required';
  end if;

  v_seller := public.current_seller_id();
  if v_seller is null and not public.is_admin_like() then
    raise exception 'Only approved sellers can add a brand';
  end if;

  v_slug := lower(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then
    v_slug := 'brand';
  end if;

  select id into v_id
  from public.brands
  where lower(name) = lower(v_name)
     or slug = v_slug
  limit 1;

  if v_id is not null then
    update public.brands
    set status = 'active'
    where id = v_id and status is distinct from 'active';
    return v_id;
  end if;

  insert into public.brands (name, slug, status, seller_id)
  values (v_name, v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6), 'active', v_seller)
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.seller_create_brand(text) to authenticated;
grant insert on public.brands to authenticated;
