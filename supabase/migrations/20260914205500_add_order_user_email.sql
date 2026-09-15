-- Add a denormalized user_email column to orders so the admin
-- dashboard can show a human-readable customer identity (instead of
-- a raw auth.users UUID) and so order-status changes can be synced
-- back to the correct GoHighLevel contact without needing a
-- service-role key to look up auth.users.
alter table public.orders add column if not exists user_email text;

comment on column public.orders.user_email is
  'Denormalized copy of the purchasing user''s email, captured at order creation time for admin display and CRM sync.';
