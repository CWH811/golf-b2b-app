-- ============================================================
-- Admin audit log: records who changed what and when for
-- catalog, order, and fleet mutations made through the admin API.
-- ============================================================

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users (id),
  admin_email text,
  action text not null,
  entity_type text not null check (entity_type in ('product', 'order', 'golf_cart')),
  entity_id text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_log_created_at on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_log_entity on public.admin_audit_log (entity_type, entity_id);

alter table public.admin_audit_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_audit_log' and policyname = 'Admins can read audit log') then
    create policy "Admins can read audit log"
      on public.admin_audit_log
      for select
      using (public.is_admin());
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'admin_audit_log' and policyname = 'Admins can write audit log') then
    create policy "Admins can write audit log"
      on public.admin_audit_log
      for insert
      with check (public.is_admin());
  end if;
end $$;
