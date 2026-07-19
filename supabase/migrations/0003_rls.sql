-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0003 · Row Level Security (aislamiento multi-tenant)
-- ═══════════════════════════════════════════════════════════════════════════
-- Regla general: un usuario solo ve/edita filas cuyo tenant_id == su tenant.
-- Las tablas generadas por triggers/RPC (installments, payout_schedule,
-- receipts, portal_tokens) son SOLO LECTURA para el cliente; las escribe el
-- backend vía funciones SECURITY DEFINER (que saltan RLS de forma controlada).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.tenants                   enable row level security;
alter table public.profiles                  enable row level security;
alter table public.subscriptions             enable row level security;
alter table public.participants              enable row level security;
alter table public.sanes                     enable row level security;
alter table public.san_participants          enable row level security;
alter table public.payout_schedule           enable row level security;
alter table public.installments              enable row level security;
alter table public.payments                  enable row level security;
alter table public.deliveries                enable row level security;
alter table public.receipts                  enable row level security;
alter table public.reminders                 enable row level security;
alter table public.notifications             enable row level security;
alter table public.audit_logs                enable row level security;
alter table public.participant_portal_tokens enable row level security;

-- ── tenants ────────────────────────────────────────────────────────────────
drop policy if exists tenants_select on public.tenants;
create policy tenants_select on public.tenants
  for select to authenticated using (id = auth_tenant_id());

drop policy if exists tenants_insert on public.tenants;
create policy tenants_insert on public.tenants
  for insert to authenticated with check (created_by = auth.uid());

drop policy if exists tenants_update on public.tenants;
create policy tenants_update on public.tenants
  for update to authenticated using (id = auth_tenant_id()) with check (id = auth_tenant_id());

-- ── profiles ─────────────────────────────────────────────────────────────--
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (tenant_id = auth_tenant_id() or id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ── subscriptions (solo lectura desde el cliente) ───────────────────────────
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (tenant_id = auth_tenant_id());

-- ── Tablas de lectura/escritura del tenant ──────────────────────────────────
-- participants
drop policy if exists participants_all on public.participants;
create policy participants_all on public.participants
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- sanes
drop policy if exists sanes_all on public.sanes;
create policy sanes_all on public.sanes
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- san_participants
drop policy if exists san_participants_all on public.san_participants;
create policy san_participants_all on public.san_participants
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- payments
drop policy if exists payments_all on public.payments;
create policy payments_all on public.payments
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- deliveries
drop policy if exists deliveries_all on public.deliveries;
create policy deliveries_all on public.deliveries
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- reminders
drop policy if exists reminders_all on public.reminders;
create policy reminders_all on public.reminders
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- notifications
drop policy if exists notifications_all on public.notifications;
create policy notifications_all on public.notifications
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- audit_logs
drop policy if exists audit_logs_all on public.audit_logs;
create policy audit_logs_all on public.audit_logs
  for all to authenticated
  using (tenant_id = auth_tenant_id())
  with check (tenant_id = auth_tenant_id());

-- ── Tablas SOLO LECTURA para el cliente (las escribe el backend) ────────────
-- installments
drop policy if exists installments_select on public.installments;
create policy installments_select on public.installments
  for select to authenticated using (tenant_id = auth_tenant_id());

-- payout_schedule
drop policy if exists payout_schedule_select on public.payout_schedule;
create policy payout_schedule_select on public.payout_schedule
  for select to authenticated using (tenant_id = auth_tenant_id());

-- receipts
drop policy if exists receipts_select on public.receipts;
create policy receipts_select on public.receipts
  for select to authenticated using (tenant_id = auth_tenant_id());

-- participant_portal_tokens
drop policy if exists portal_tokens_select on public.participant_portal_tokens;
create policy portal_tokens_select on public.participant_portal_tokens
  for select to authenticated using (tenant_id = auth_tenant_id());
