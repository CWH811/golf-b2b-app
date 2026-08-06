-- ============================================================
-- GCore Core Tables Schema Fix
-- Adds missing columns to existing tables
-- ============================================================

-- ─────────────────────────────────────────────
-- PRODUCTS: Add missing columns if not present
-- ─────────────────────────────────────────────
do $$
begin
  -- Add status column
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'status') then
    alter table public.products add column status text not null default 'active' check (status in ('active', 'archived'));
  end if;

  -- Add quantity_on_hand column
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'quantity_on_hand') then
    alter table public.products add column quantity_on_hand integer not null default 0 check (quantity_on_hand >= 0);
  end if;

  -- Add modified_by column
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'modified_by') then
    alter table public.products add column modified_by uuid references auth.users (id);
  end if;

  -- Add created_at column
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'created_at') then
    alter table public.products add column created_at timestamptz not null default now();
  end if;

  -- Add updated_at column
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name = 'updated_at') then
    alter table public.products add column updated_at timestamptz not null default now();
  end if;
end $$;

-- Create indexes if missing
create index if not exists idx_products_status on public.products (status);
create index if not exists idx_products_name on public.products (name);

-- ─────────────────────────────────────────────
-- ORDERS: Add missing columns if not present
-- ─────────────────────────────────────────────
do $$
begin
  -- Add modified_by column
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'orders' and column_name = 'modified_by') then
    alter table public.orders add column modified_by uuid references auth.users (id);
  end if;
end $$;

-- ─────────────────────────────────────────────
-- RLS Policies (products)
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- ORDERS: RLS Policies
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- ORDER ITEMS: RLS Policies
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────
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