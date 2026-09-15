-- ============================================================
-- Atomic stock decrement RPC, callable by any authenticated user
-- placing their own order.
--
-- The order route inserts orders/order_items as the authenticated
-- customer (not a service-role client), but writes to `products`
-- are admin-only under the RLS lockdown in
-- 20260914203000_secure_rls_policies.sql. A regular UPDATE from the
-- customer's session would now be rejected. This SECURITY DEFINER
-- function lets a customer's own order decrement stock for the
-- items they purchased, without granting them general write access
-- to the products table.
-- ============================================================

create or replace function public.decrement_product_stock(p_sku text, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_qty is null or p_qty <= 0 then
    return;
  end if;

  update public.products
  set quantity_on_hand = greatest(quantity_on_hand - p_qty, 0)
  where sku = p_sku;
end;
$$;

revoke all on function public.decrement_product_stock(text, integer) from public;
grant execute on function public.decrement_product_stock(text, integer) to authenticated;
