-- ============================================================
-- GCore Core Tables Migration
-- products, orders, order_items
-- ============================================================

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────
-- PRODUCTS
-- ─────────────────────────────────────────────
create table if not exists public.products (
  sku text primary key,
  name text not null,
  base_price numeric(10, 2) not null default 0 check (base_price >= 0),
  quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  modified_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_name on public.products (name);

alter table public.products enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'Authenticated users can read products') then
    create policy "Authenticated users can read products"
      on public.products
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'Authenticated users can insert products') then
    create policy "Authenticated users can insert products"
      on public.products
      for insert
      with check (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'Authenticated users can update products') then
    create policy "Authenticated users can update products"
      on public.products
      for update
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'Authenticated users can delete products') then
    create policy "Authenticated users can delete products"
      on public.products
      for delete
      using (auth.uid() is not null);
  end if;
end $$;

create or replace function public.update_products_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.modified_by = auth.uid();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_products_updated_at on public.products;
create trigger update_products_updated_at
before update on public.products
for each row
execute function public.update_products_updated_at();

-- ─────────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────────
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'shipped', 'cancelled')),
  modified_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

alter table public.orders enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Authenticated users can read orders') then
    create policy "Authenticated users can read orders"
      on public.orders
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Authenticated users can insert orders') then
    create policy "Authenticated users can insert orders"
      on public.orders
      for insert
      with check (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Authenticated users can update orders') then
    create policy "Authenticated users can update orders"
      on public.orders
      for update
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'orders' and policyname = 'Authenticated users can delete orders') then
    create policy "Authenticated users can delete orders"
      on public.orders
      for delete
      using (auth.uid() is not null);
  end if;
end $$;

create or replace function public.update_orders_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  new.modified_by = auth.uid();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_orders_updated_at on public.orders;
create trigger update_orders_updated_at
before update on public.orders
for each row
execute function public.update_orders_updated_at();

-- ─────────────────────────────────────────────
-- ORDER ITEMS
-- ─────────────────────────────────────────────
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  sku text not null references public.products (sku),
  quantity integer not null default 1 check (quantity > 0),
  price_at_purchase numeric(10, 2) not null check (price_at_purchase >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_order_items_sku on public.order_items (sku);

alter table public.order_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'Authenticated users can read order items') then
    create policy "Authenticated users can read order items"
      on public.order_items
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'Authenticated users can insert order items') then
    create policy "Authenticated users can insert order items"
      on public.order_items
      for insert
      with check (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'Authenticated users can update order items') then
    create policy "Authenticated users can update order items"
      on public.order_items
      for update
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'order_items' and policyname = 'Authenticated users can delete order items') then
    create policy "Authenticated users can delete order items"
      on public.order_items
      for delete
      using (auth.uid() is not null);
  end if;
end $$;