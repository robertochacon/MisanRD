-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0005 · Endurecimiento de seguridad
-- Corrige hallazgos de la revisión adversarial:
--  · CRÍTICO: un usuario podía unirse/cambiar a un tenant ajeno vía profiles.
--  · ALTO: pagos/entregas con IDs de otro tenant corrompían datos de la víctima.
--  · Rotación (revocación) de tokens del portal.
--  · Reversa de entregas al borrarlas; recálculo de cuota origen al reasignar.
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- CRÍTICO #1 — profiles: quitar INSERT directo del cliente.
-- El único camino para crear un profile es setup_tenant() (SECURITY DEFINER),
-- que fija tenant_id de forma segura. Sin política de INSERT, PostgREST bloquea
-- cualquier intento del cliente de auto-asignarse un tenant ajeno.
-- ──────────────────────────────────────────────────────────────────────────
drop policy if exists profiles_insert on public.profiles;

-- ──────────────────────────────────────────────────────────────────────────
-- CRÍTICO #2 — profiles: tenant_id y role son INMUTABLES vía cliente.
-- El UPDATE sigue permitido (full_name, avatar_url), pero no puede mover el
-- perfil a otro tenant ni auto-escalar el rol.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'No se permite cambiar el tenant de un perfil';
  end if;
  if new.role is distinct from old.role then
    raise exception 'No se permite cambiar el rol desde el cliente';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_guard on public.profiles;
create trigger trg_profiles_guard
  before update on public.profiles
  for each row execute function public.profiles_guard();

-- ──────────────────────────────────────────────────────────────────────────
-- ALTO #3 — payments: el installment/san/participante debe ser del MISMO tenant.
-- Trigger INVOKER (respeta RLS): solo ve filas del tenant del usuario, así que
-- un installment_id ajeno no existe para él → se rechaza.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_payment_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from public.sanes where id = new.san_id and tenant_id = new.tenant_id;
  if not found then raise exception 'El San no pertenece a tu cuenta'; end if;

  perform 1 from public.participants where id = new.participant_id and tenant_id = new.tenant_id;
  if not found then raise exception 'El participante no pertenece a tu cuenta'; end if;

  if new.installment_id is not null then
    perform 1 from public.installments
      where id = new.installment_id
        and tenant_id = new.tenant_id
        and san_id = new.san_id
        and participant_id = new.participant_id;
    if not found then
      raise exception 'La cuota no corresponde al tenant/San/participante indicado';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_payment_consistency on public.payments;
create trigger trg_payment_consistency
  before insert or update on public.payments
  for each row execute function public.enforce_payment_consistency();

-- ──────────────────────────────────────────────────────────────────────────
-- ALTO #4 — deliveries: el payout/san/beneficiario debe ser del MISMO tenant.
-- Cubre INSERT *y* UPDATE (evita reasignar payout_schedule_id/san_id a otro
-- tenant vía PATCH y luego disparar la reversa cross-tenant al borrar).
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_delivery_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform 1 from public.payout_schedule
    where id = new.payout_schedule_id
      and tenant_id = new.tenant_id
      and san_id = new.san_id;
  if not found then raise exception 'La entrega no corresponde al tenant/San indicado'; end if;

  perform 1 from public.participants
    where id = new.recipient_participant_id and tenant_id = new.tenant_id;
  if not found then raise exception 'El beneficiario no pertenece a tu cuenta'; end if;

  return new;
end;
$$;

drop trigger if exists trg_delivery_consistency on public.deliveries;
create trigger trg_delivery_consistency
  before insert or update on public.deliveries
  for each row execute function public.enforce_delivery_consistency();

-- Defensa en profundidad: on_delivery_insert acota sus UPDATE por tenant.
create or replace function public.on_delivery_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pending int;
begin
  update payout_schedule set status = 'delivered'
    where id = new.payout_schedule_id and tenant_id = new.tenant_id;

  select count(*) into v_pending
  from payout_schedule
  where san_id = new.san_id and tenant_id = new.tenant_id and status <> 'delivered';

  if v_pending = 0 then
    update sanes set status = 'completed', updated_at = now()
      where id = new.san_id and tenant_id = new.tenant_id and status = 'active';
  end if;

  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- MEDIO #7 — Reversa al borrar una entrega: el payout vuelve a 'pending' y,
-- si el San estaba 'completed', vuelve a 'active'.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.on_delivery_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update payout_schedule set status = 'pending'
    where id = old.payout_schedule_id and tenant_id = old.tenant_id;
  update sanes set status = 'active', updated_at = now()
    where id = old.san_id and tenant_id = old.tenant_id and status = 'completed';
  return old;
end;
$$;

drop trigger if exists trg_delivery_delete on public.deliveries;
create trigger trg_delivery_delete
  after delete on public.deliveries
  for each row execute function public.on_delivery_delete();

-- ──────────────────────────────────────────────────────────────────────────
-- BAJO #10 — recalc de cuota: al reasignar un pago (UPDATE installment_id) o al
-- borrarlo, recalcular también la cuota ORIGEN, no solo la nueva.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.recalc_one_installment(p_inst uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric(12, 2);
  v_amount numeric(12, 2);
begin
  if p_inst is null then return; end if;
  select amount into v_amount from installments where id = p_inst;
  if v_amount is null then return; end if;
  select coalesce(sum(amount), 0) into v_paid from payments where installment_id = p_inst;
  update installments
  set paid_amount = v_paid,
      status = case
        when v_paid <= 0 then 'pending'::installment_status
        when v_paid >= v_amount then 'paid'::installment_status
        else 'partial'::installment_status
      end
  where id = p_inst;
end;
$$;

create or replace function public.recalc_installment_from_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_one_installment(old.installment_id);
    return old;
  end if;

  perform public.recalc_one_installment(new.installment_id);
  if tg_op = 'UPDATE' and old.installment_id is distinct from new.installment_id then
    perform public.recalc_one_installment(old.installment_id);
  end if;
  return new;
end;
$$;
-- (el trigger trg_payment_recalc de 0002 sigue vigente; solo cambió la función)

-- ──────────────────────────────────────────────────────────────────────────
-- ALTO #5 — Revocación de tokens del portal por rotación.
-- Al rotar, el enlace anterior deja de ser válido inmediatamente.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.rotate_portal_token(p_participant_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
begin
  update participant_portal_tokens
  set token = encode(gen_random_bytes(16), 'hex')
  where participant_id = p_participant_id
    and tenant_id = auth_tenant_id()
  returning token into v_token;

  if v_token is null then
    raise exception 'Token no encontrado o no autorizado';
  end if;
  return v_token;
end;
$$;

grant execute on function public.rotate_portal_token(uuid) to authenticated;
