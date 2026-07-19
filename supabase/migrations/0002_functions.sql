-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0002 · Funciones y triggers (lógica de negocio)
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- auth_tenant_id() — tenant del usuario autenticado (base de todo el RLS)
-- security definer: puede leer profiles sin recursión de RLS.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.auth_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- set_updated_at() — trigger genérico
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_tenants_updated on public.tenants;
create trigger trg_tenants_updated before update on public.tenants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sanes_updated on public.sanes;
create trigger trg_sanes_updated before update on public.sanes
  for each row execute function public.set_updated_at();

drop trigger if exists trg_participants_updated on public.participants;
create trigger trg_participants_updated before update on public.participants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated on public.subscriptions;
create trigger trg_subscriptions_updated before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ──────────────────────────────────────────────────────────────────────────
-- setup_tenant() — onboarding: crea tenant + profile + subscription
-- Se ejecuta con security definer porque en ese momento el usuario aún no
-- tiene profile (y por tanto auth_tenant_id() es null → RLS bloquearía).
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.setup_tenant(
  p_name text,
  p_full_name text default null,
  p_whatsapp text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant uuid;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  select tenant_id into v_tenant from profiles where id = v_uid;
  if v_tenant is not null then
    return v_tenant; -- ya tiene tenant (idempotente)
  end if;

  insert into tenants (name, whatsapp, created_by)
  values (coalesce(nullif(trim(p_name), ''), 'Mi negocio'), nullif(trim(p_whatsapp), ''), v_uid)
  returning id into v_tenant;

  insert into profiles (id, tenant_id, full_name, role)
  values (v_uid, v_tenant, nullif(trim(p_full_name), ''), 'owner');

  insert into subscriptions (tenant_id, plan, status, trial_ends_at)
  values (v_tenant, 'basic', 'trial', now() + interval '30 days');

  return v_tenant;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- san_period_date() — fecha del período p según la frecuencia
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.san_period_date(
  p_start date,
  p_freq san_frequency,
  p_period int
)
returns date
language sql
immutable
as $$
  select case p_freq
    when 'daily'    then p_start + make_interval(days  => (p_period - 1))
    when 'weekly'   then p_start + make_interval(days  => (p_period - 1) * 7)
    when 'biweekly' then p_start + make_interval(days  => (p_period - 1) * 14)
    when 'monthly'  then p_start + make_interval(months => (p_period - 1))
  end::date
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- generate_san_schedule() — genera payout_schedule + installments y activa
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.generate_san_schedule(p_san_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_san   public.sanes;
  v_n     int;
  v_pot   numeric(12, 2);
  r       record;
  v_date  date;
begin
  select * into v_san from sanes where id = p_san_id;
  if not found then
    raise exception 'San no encontrado';
  end if;
  if v_san.tenant_id <> auth_tenant_id() then
    raise exception 'No autorizado';
  end if;
  if v_san.status <> 'draft' then
    raise exception 'El San ya fue activado';
  end if;

  select count(*) into v_n from san_participants where san_id = p_san_id;
  if v_n < 2 then
    raise exception 'Se necesitan al menos 2 participantes para activar el San';
  end if;

  -- Rehacer cronograma si se regenera un borrador
  delete from installments where san_id = p_san_id;
  delete from payout_schedule where san_id = p_san_id;

  v_pot := v_san.contribution_amount * v_n;

  for r in
    select position, participant_id
    from san_participants
    where san_id = p_san_id
    order by position
  loop
    v_date := public.san_period_date(v_san.start_date, v_san.frequency, r.position);

    insert into payout_schedule
      (tenant_id, san_id, period_number, scheduled_date, recipient_participant_id, expected_amount)
    values
      (v_san.tenant_id, p_san_id, r.position, v_date, r.participant_id, v_pot);

    -- Una cuota por CADA participante en este período
    insert into installments
      (tenant_id, san_id, san_participant_id, participant_id, period_number, due_date, amount)
    select
      v_san.tenant_id, p_san_id, sp.id, sp.participant_id, r.position, v_date, v_san.contribution_amount
    from san_participants sp
    where sp.san_id = p_san_id;
  end loop;

  update sanes
  set status = 'active', participant_count = v_n, updated_at = now()
  where id = p_san_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- recalc_installment_from_payment() — mantiene paid_amount + status de la cuota
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.recalc_installment_from_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inst uuid;
  v_paid numeric(12, 2);
  v_amount numeric(12, 2);
begin
  v_inst := coalesce(new.installment_id, old.installment_id);
  if v_inst is null then
    return coalesce(new, old);
  end if;

  select coalesce(sum(amount), 0) into v_paid from payments where installment_id = v_inst;
  select amount into v_amount from installments where id = v_inst;

  update installments
  set paid_amount = v_paid,
      status = case
        when v_paid <= 0 then 'pending'::installment_status
        when v_paid >= v_amount then 'paid'::installment_status
        else 'partial'::installment_status
      end
  where id = v_inst;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_payment_recalc on public.payments;
create trigger trg_payment_recalc
  after insert or delete or update of amount, installment_id on public.payments
  for each row execute function public.recalc_installment_from_payment();

-- ──────────────────────────────────────────────────────────────────────────
-- create_receipt_for_payment() — numeración por tenant + payload QR
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.create_receipt_for_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq bigint;
  v_num text;
begin
  update tenants set receipt_seq = receipt_seq + 1
  where id = new.tenant_id
  returning receipt_seq into v_seq;

  v_num := 'R-' || lpad(v_seq::text, 6, '0');

  insert into receipts (tenant_id, payment_id, number, qr_payload)
  values (new.tenant_id, new.id, v_num, 'MISANRD|' || new.id::text || '|' || v_num);

  return new;
end;
$$;

drop trigger if exists trg_payment_receipt on public.payments;
create trigger trg_payment_receipt
  after insert on public.payments
  for each row execute function public.create_receipt_for_payment();

-- ──────────────────────────────────────────────────────────────────────────
-- on_delivery_insert() — marca payout entregado y cierra el San si terminó
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.on_delivery_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending int;
begin
  update payout_schedule set status = 'delivered' where id = new.payout_schedule_id;

  select count(*) into v_pending
  from payout_schedule
  where san_id = new.san_id and status <> 'delivered';

  if v_pending = 0 then
    update sanes set status = 'completed', updated_at = now()
    where id = new.san_id and status = 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_delivery_insert on public.deliveries;
create trigger trg_delivery_insert
  after insert on public.deliveries
  for each row execute function public.on_delivery_insert();

-- ──────────────────────────────────────────────────────────────────────────
-- create_portal_token() — token de portal automático al crear participante
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.create_portal_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into participant_portal_tokens (tenant_id, participant_id)
  values (new.tenant_id, new.id)
  on conflict (participant_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_participant_portal_token on public.participants;
create trigger trg_participant_portal_token
  after insert on public.participants
  for each row execute function public.create_portal_token();

-- ──────────────────────────────────────────────────────────────────────────
-- Límites por plan (defensa en profundidad; la UI también los aplica)
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_san_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan plan_code;
  v_count int;
begin
  select plan into v_plan from subscriptions where tenant_id = new.tenant_id;
  if v_plan = 'basic' then
    select count(*) into v_count
    from sanes
    where tenant_id = new.tenant_id and status in ('draft', 'active');
    if v_count >= 2 then
      raise exception 'PLAN_LIMIT_SANES: El plan Básico permite máximo 2 Sanes activos. Actualiza tu plan para crear más.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_san_limit on public.sanes;
create trigger trg_enforce_san_limit
  before insert on public.sanes
  for each row execute function public.enforce_san_limit();

create or replace function public.enforce_participant_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan plan_code;
  v_count int;
begin
  select plan into v_plan from subscriptions where tenant_id = new.tenant_id;
  if v_plan = 'basic' then
    select count(*) into v_count from participants where tenant_id = new.tenant_id;
    if v_count >= 30 then
      raise exception 'PLAN_LIMIT_PARTICIPANTS: El plan Básico permite máximo 30 participantes. Actualiza tu plan.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_participant_limit on public.participants;
create trigger trg_enforce_participant_limit
  before insert on public.participants
  for each row execute function public.enforce_participant_limit();

-- ──────────────────────────────────────────────────────────────────────────
-- dashboard_summary() — métricas del tenant para el Dashboard
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.dashboard_summary()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  t uuid := auth_tenant_id();
  result jsonb;
begin
  if t is null then
    return '{}'::jsonb;
  end if;

  select jsonb_build_object(
    'active_sanes',        (select count(*) from sanes where tenant_id = t and status = 'active'),
    'completed_sanes',     (select count(*) from sanes where tenant_id = t and status = 'completed'),
    'draft_sanes',         (select count(*) from sanes where tenant_id = t and status = 'draft'),
    'total_participants',  (select count(*) from participants where tenant_id = t),
    'active_participants', (select count(*) from participants where tenant_id = t and status = 'active'),
    'pending_installments',(select count(*) from installments where tenant_id = t and status <> 'paid'),
    'pending_amount',      (select coalesce(sum(amount - paid_amount), 0) from installments where tenant_id = t and status <> 'paid'),
    'collected_today',     (select coalesce(sum(amount), 0) from payments where tenant_id = t and paid_at = current_date),
    'collected_total',     (select coalesce(sum(amount), 0) from payments where tenant_id = t),
    'overdue_installments',(select count(*) from installments where tenant_id = t and status <> 'paid' and due_date < current_date),
    'morosos_count',       (select count(distinct participant_id) from installments where tenant_id = t and status <> 'paid' and due_date < current_date),
    'next_payout', (
      select jsonb_build_object(
        'date', ps.scheduled_date,
        'amount', ps.expected_amount,
        'recipient', p.full_name,
        'san', s.name
      )
      from payout_schedule ps
      join participants p on p.id = ps.recipient_participant_id
      join sanes s on s.id = ps.san_id
      where ps.tenant_id = t and ps.status = 'pending' and ps.scheduled_date >= current_date
      order by ps.scheduled_date asc
      limit 1
    )
  ) into result;

  return result;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- Permisos de ejecución
-- ──────────────────────────────────────────────────────────────────────────
grant execute on function public.auth_tenant_id() to authenticated;
grant execute on function public.setup_tenant(text, text, text) to authenticated;
grant execute on function public.generate_san_schedule(uuid) to authenticated;
grant execute on function public.san_period_date(date, san_frequency, int) to authenticated, anon;
grant execute on function public.dashboard_summary() to authenticated;
