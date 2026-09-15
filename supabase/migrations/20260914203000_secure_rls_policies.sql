-- ============================================================
-- Lock down RLS: replace "any authenticated user" policies with
-- owner-scoped access (orders/order_items) and admin-gated writes
-- (products, orders, order_items, golf_cart_fleet).
--
-- Previously every policy on these tables was `auth.uid() is not
-- null`, which meant ANY signed-up user could read every other
-- user's orders and directly edit/delete products or orders via
-- the Supabase client (bypassing the owner-only Next.js admin API
-- entirely). This migration introduces a real admin_users table
-- and scopes orders/order_items to their owning user.
--
-- ⚠️ MANUAL STEP REQUIRED AFTER RUNNING THIS MIGRATION:
-- Insert your admin account into admin_users, e.g.:
--   insert into public.admin_users (user_id) values ('<ADMIN_USER_ID>');
-- Without this, admin API routes (catalog edits, order status
-- updates) will be blocked at the database level even though the
-- app-layer ADMIN_USER_ID/ADMIN_EMAIL check passes.
-- ============================================================

-- ─────────────────────────────────────────────
-- ADMIN MEMBERSHIP TABLE
-- ─────────────────────────────────────────────
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_users' and policyname = 'No client access to admin_users') then
    create policy "No client access to admin_users"
      on public.admin_users
      for all
      using (false)
      with check (false);
  end if;
end $$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────
-- PRODUCTS: read stays open to all authenticated users (needed for
-- scanning/ordering); writes are admin-only.
-- ─────────────────────────────────────────────
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;

create policy "Admins can insert products"
  on public.products
  for insert
  with check (public.is_admin());

create policy "Admins can update products"
  on public.products
  for update
  using (public.is_admin());

create policy "Admins can delete products"
  on public.products
  for delete
  using (public.is_admin());

-- ─────────────────────────────────────────────
-- ORDERS: users can read/create only their own orders; only admins
-- can update (status transitions) or delete any order.
-- ─────────────────────────────────────────────
drop policy if exists "Authenticated users can read orders" on public.orders;
drop policy if exists "Authenticated users can insert orders" on public.orders;
drop policy if exists "Authenticated users can update orders" on public.orders;
drop policy if exists "Authenticated users can delete orders" on public.orders;

create policy "Users read own orders, admins read all"
  on public.orders
  for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Users create their own orders"
  on public.orders
  for insert
  with check (auth.uid() = user_id);

create policy "Admins update orders"
  on public.orders
  for update
  using (public.is_admin());

create policy "Admins delete orders"
  on public.orders
  for delete
  using (public.is_admin());

-- ─────────────────────────────────────────────
-- ORDER_ITEMS: readable/insertable only for the current user's own
-- order (or by admins); mutation of existing items is admin-only.
-- ─────────────────────────────────────────────
drop policy if exists "Authenticated users can read order items" on public.order_items;
drop policy if exists "Authenticated users can insert order items" on public.order_items;
drop policy if exists "Authenticated users can update order items" on public.order_items;
drop policy if exists "Authenticated users can delete order items" on public.order_items;

create policy "Users read own order items, admins read all"
  on public.order_items
  for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy "Users insert items into their own orders"
  on public.order_items
  for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid()
    )
  );

create policy "Admins update order items"
  on public.order_items
  for update
  using (public.is_admin());

create policy "Admins delete order items"
  on public.order_items
  for delete
  using (public.is_admin());

-- ─────────────────────────────────────────────
-- GOLF_CART_FLEET: read stays open to authenticated staff; writes
-- (status/battery/service updates) are admin-only.
-- ─────────────────────────────────────────────
drop policy if exists "Authenticated users can insert golf cart fleet" on public.golf_cart_fleet;
drop policy if exists "Authenticated users can update golf cart fleet" on public.golf_cart_fleet;
drop policy if exists "Authenticated users can delete golf cart fleet" on public.golf_cart_fleet;

create policy "Admins can insert golf cart fleet"
  on public.golf_cart_fleet
  for insert
  with check (public.is_admin());

create policy "Admins can update golf cart fleet"
  on public.golf_cart_fleet
  for update
  using (public.is_admin());

create policy "Admins can delete golf cart fleet"
  on public.golf_cart_fleet
  for delete
  using (public.is_admin());
