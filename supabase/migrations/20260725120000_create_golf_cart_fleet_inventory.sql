create extension if not exists pgcrypto;

create table if not exists public.golf_cart_fleet (
  id uuid primary key default gen_random_uuid(),
  cart_number text not null unique,
  model text not null,
  status text not null default 'available' check (status in ('available', 'in_use', 'maintenance', 'out_of_service')),
  battery_level integer not null default 100 check (battery_level between 0 and 100),
  odometer_miles integer not null default 0 check (odometer_miles >= 0),
  location text not null default 'fleet-yard',
  assigned_to text,
  last_service_at timestamptz,
  next_service_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_golf_cart_fleet_status on public.golf_cart_fleet (status);
create index if not exists idx_golf_cart_fleet_location on public.golf_cart_fleet (location);
create index if not exists idx_golf_cart_fleet_next_service on public.golf_cart_fleet (next_service_at);

alter table public.golf_cart_fleet enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'golf_cart_fleet' and policyname = 'Authenticated users can read golf cart fleet') then
    create policy "Authenticated users can read golf cart fleet"
      on public.golf_cart_fleet
      for select
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'golf_cart_fleet' and policyname = 'Authenticated users can insert golf cart fleet') then
    create policy "Authenticated users can insert golf cart fleet"
      on public.golf_cart_fleet
      for insert
      with check (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'golf_cart_fleet' and policyname = 'Authenticated users can update golf cart fleet') then
    create policy "Authenticated users can update golf cart fleet"
      on public.golf_cart_fleet
      for update
      using (auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'golf_cart_fleet' and policyname = 'Authenticated users can delete golf cart fleet') then
    create policy "Authenticated users can delete golf cart fleet"
      on public.golf_cart_fleet
      for delete
      using (auth.uid() is not null);
  end if;
end $$;

create or replace function public.update_golf_cart_fleet_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_golf_cart_fleet_updated_at on public.golf_cart_fleet;
create trigger update_golf_cart_fleet_updated_at
before update on public.golf_cart_fleet
for each row
execute function public.update_golf_cart_fleet_updated_at();