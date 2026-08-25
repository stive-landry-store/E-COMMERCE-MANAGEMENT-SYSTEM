-- Admins must be able to update store-owned variant prices (what the shop displays).
-- owns_product() already includes is_admin_like(); repeat it on the policy so UPDATE cannot be silently skipped.

drop policy if exists "variant writers" on public.product_variants;
create policy "variant writers" on public.product_variants
for all
using (public.is_admin_like() or public.owns_product(product_id))
with check (public.is_admin_like() or public.owns_product(product_id));
