-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0001 · Esquema base (modelo de datos multi-tenant)
-- ═══════════════════════════════════════════════════════════════════════════
-- Cada "tenant" es una administradora. Todo dato operativo lleva tenant_id y
-- queda aislado por RLS (ver 0003_rls.sql). Un usuario (auth.users) pertenece
-- a exactamente un tenant vía profiles. Premium permite varios usuarios (admins)
-- en el mismo tenant.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ──────────────────────────────────────────────────────────────────────────
-- Tipos (enums) del dominio
-- ──────────────────────────────────────────────────────────────────────────
do $$ begin
  create type san_frequency as enum ('daily', 'weekly', 'biweekly', 'monthly');
exception when duplicate_object then null; end $$;

do $$ begin
  create type san_status as enum ('draft', 'active', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_type as enum ('manual', 'random');
exception when duplicate_object then null; end $$;

do $$ begin
  create type participant_status as enum ('active', 'suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type installment_status as enum ('pending', 'partial', 'paid');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payout_status as enum ('pending', 'delivered');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('cash', 'transfer', 'yape', 'bank', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type plan_code as enum ('basic', 'entrepreneur', 'premium');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('trial', 'active', 'past_due', 'canceled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_role as enum ('owner', 'admin');
exception when duplicate_object then null; end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- tenants — la administradora / espacio de trabajo
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  logo_url      text,
  whatsapp      text,
  phone         text,
  email         text,
  address       text,
  bank_name     text,
  bank_account  text,
  signature_url text,
  currency      text not null default 'DOP',
  receipt_seq   bigint not null default 0,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────────
-- profiles — 1 por usuario de auth; lo enlaza a su tenant
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  tenant_id  uuid references public.tenants (id) on delete cascade,
  full_name  text,
  avatar_url text,
  role       member_role not null default 'owner',
  created_at timestamptz not null default now()
);
create index if not exists profiles_tenant_idx on public.profiles (tenant_id);

-- ──────────────────────────────────────────────────────────────────────────
-- subscriptions — 1 por tenant
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null unique references public.tenants (id) on delete cascade,
  plan               plan_code not null default 'basic',
  status             subscription_status not null default 'trial',
  started_at         timestamptz not null default now(),
  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  updated_at         timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────────────────
-- participants — personas de la libreta (reutilizables entre sanes)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.participants (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  full_name  text not null,
  phone      text,
  whatsapp   text,
  cedula     text,
  address    text,
  photo_url  text,
  status     participant_status not null default 'active',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists participants_tenant_idx on public.participants (tenant_id);

-- ──────────────────────────────────────────────────────────────────────────
-- sanes — el San / SUSU
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.sanes (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  name                text not null,
  description         text,
  contribution_amount numeric(12, 2) not null check (contribution_amount > 0),
  frequency           san_frequency not null,
  participant_count   int not null check (participant_count > 0),
  start_date          date not null,
  order_type          order_type not null default 'manual',
  status              san_status not null default 'draft',
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists sanes_tenant_idx on public.sanes (tenant_id);
create index if not exists sanes_status_idx on public.sanes (tenant_id, status);

-- ──────────────────────────────────────────────────────────────────────────
-- san_participants — membresía + orden de entrega (turno)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.san_participants (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  san_id         uuid not null references public.sanes (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete restrict,
  position       int not null check (position > 0),
  created_at     timestamptz not null default now(),
  unique (san_id, participant_id),
  unique (san_id, position)
);
create index if not exists san_participants_san_idx on public.san_participants (san_id);
create index if not exists san_participants_participant_idx on public.san_participants (participant_id);

-- ──────────────────────────────────────────────────────────────────────────
-- payout_schedule — entregas programadas (1 por período)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.payout_schedule (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenants (id) on delete cascade,
  san_id                  uuid not null references public.sanes (id) on delete cascade,
  period_number           int not null check (period_number > 0),
  scheduled_date          date not null,
  recipient_participant_id uuid not null references public.participants (id) on delete restrict,
  expected_amount         numeric(12, 2) not null,
  status                  payout_status not null default 'pending',
  unique (san_id, period_number)
);
create index if not exists payout_schedule_san_idx on public.payout_schedule (san_id);

-- ──────────────────────────────────────────────────────────────────────────
-- installments — cuotas (cada participante debe 1 por período)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.installments (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.tenants (id) on delete cascade,
  san_id            uuid not null references public.sanes (id) on delete cascade,
  san_participant_id uuid not null references public.san_participants (id) on delete cascade,
  participant_id    uuid not null references public.participants (id) on delete restrict,
  period_number     int not null check (period_number > 0),
  due_date          date not null,
  amount            numeric(12, 2) not null check (amount > 0),
  paid_amount       numeric(12, 2) not null default 0,
  status            installment_status not null default 'pending',
  unique (san_participant_id, period_number)
);
create index if not exists installments_san_idx on public.installments (san_id);
create index if not exists installments_participant_idx on public.installments (participant_id);
create index if not exists installments_status_idx on public.installments (tenant_id, status);
create index if not exists installments_due_idx on public.installments (tenant_id, due_date);

-- ──────────────────────────────────────────────────────────────────────────
-- payments — pagos aplicados a una cuota
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  san_id         uuid not null references public.sanes (id) on delete cascade,
  installment_id uuid references public.installments (id) on delete set null,
  participant_id uuid not null references public.participants (id) on delete restrict,
  amount         numeric(12, 2) not null check (amount > 0),
  paid_at        date not null default current_date,
  method         payment_method not null default 'cash',
  notes          text,
  created_by     uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists payments_san_idx on public.payments (san_id);
create index if not exists payments_installment_idx on public.payments (installment_id);
create index if not exists payments_date_idx on public.payments (tenant_id, paid_at);

-- ──────────────────────────────────────────────────────────────────────────
-- deliveries — entregas realizadas de un payout
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.deliveries (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.tenants (id) on delete cascade,
  san_id                   uuid not null references public.sanes (id) on delete cascade,
  payout_schedule_id       uuid not null unique references public.payout_schedule (id) on delete cascade,
  recipient_participant_id uuid not null references public.participants (id) on delete restrict,
  amount                   numeric(12, 2) not null,
  delivered_on             date not null default current_date,
  delivered_time           time,
  signature_url            text,
  receipt_image_url        text,
  notes                    text,
  created_by               uuid references auth.users (id) on delete set null,
  created_at               timestamptz not null default now()
);
create index if not exists deliveries_san_idx on public.deliveries (san_id);

-- ──────────────────────────────────────────────────────────────────────────
-- receipts — recibo generado por pago (numeración + QR)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.receipts (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  payment_id uuid not null unique references public.payments (id) on delete cascade,
  number     text not null,
  qr_payload text,
  created_at timestamptz not null default now()
);
create index if not exists receipts_tenant_idx on public.receipts (tenant_id);

-- ──────────────────────────────────────────────────────────────────────────
-- reminders — recordatorios (log)
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.reminders (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  san_id         uuid references public.sanes (id) on delete cascade,
  participant_id uuid references public.participants (id) on delete cascade,
  type           text not null default 'payment_due',
  channel        text not null default 'whatsapp',
  message        text,
  status         text not null default 'sent',
  sent_at        timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
create index if not exists reminders_tenant_idx on public.reminders (tenant_id);

-- ──────────────────────────────────────────────────────────────────────────
-- notifications — avisos in-app
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  title      text not null,
  body       text,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_tenant_idx on public.notifications (tenant_id, read);

-- ──────────────────────────────────────────────────────────────────────────
-- audit_logs — bitácora
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  user_id    uuid references auth.users (id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  meta       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_tenant_idx on public.audit_logs (tenant_id, created_at desc);

-- ──────────────────────────────────────────────────────────────────────────
-- participant_portal_tokens — acceso de solo lectura del participante
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.participant_portal_tokens (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  participant_id uuid not null unique references public.participants (id) on delete cascade,
  token          text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_at     timestamptz not null default now()
);
create index if not exists portal_tokens_token_idx on public.participant_portal_tokens (token);
