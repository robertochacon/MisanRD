-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0010 · Solicitudes de cambio de plan (dueña → super-admin)
-- ═══════════════════════════════════════════════════════════════════════════
-- La dueña de un negocio puede SOLICITAR un cambio de plan (p. ej. a Premium)
-- desde Configuración. La solicitud llega al panel del super-admin, que la
-- APRUEBA (cambia el plan) o la RECHAZA.
--
-- INVARIANTES DE SEGURIDAD (consistentes con 0005–0009):
--   • La escritura NO se hace desde el cliente: no hay políticas INSERT/UPDATE/
--     DELETE. Todo pasa por RPCs SECURITY DEFINER con guardia explícita.
--   • La dueña solo puede crear solicitudes para SU tenant (auth_tenant_id()).
--   • Solo el super-admin (auth_is_platform_admin, SIN tenant propio) lee todas
--     las solicitudes y las resuelve; la aprobación cambia la suscripción con la
--     misma lógica idempotente que admin_set_subscription.
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1) Tabla de solicitudes
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.plan_requests (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  requested_plan plan_code not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'approved', 'rejected')),
  note           text,
  requested_by   uuid references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  resolved_by    uuid references auth.users (id) on delete set null
);

create index if not exists idx_plan_requests_tenant on public.plan_requests (tenant_id);
create index if not exists idx_plan_requests_status on public.plan_requests (status);

-- A lo sumo UNA solicitud pendiente por negocio (evita duplicados/spam).
create unique index if not exists uq_plan_requests_one_pending
  on public.plan_requests (tenant_id)
  where status = 'pending';

alter table public.plan_requests enable row level security;

-- ──────────────────────────────────────────────────────────────────────────
-- 2) RLS (SOLO lectura; la escritura va por RPCs definer)
-- ──────────────────────────────────────────────────────────────────────────
-- La cuenta ve las solicitudes de su propio negocio (para mostrar el estado).
drop policy if exists plan_requests_select_own on public.plan_requests;
create policy plan_requests_select_own on public.plan_requests
  for select to authenticated
  using (tenant_id = public.auth_tenant_id());

-- El super-admin (sin tenant propio) ve todas las solicitudes.
drop policy if exists plan_requests_platform_select on public.plan_requests;
create policy plan_requests_platform_select on public.plan_requests
  for select to authenticated
  using (public.auth_is_platform_admin() and public.auth_tenant_id() is null);

-- (sin políticas insert/update/delete → escritura denegada para el cliente)

-- ──────────────────────────────────────────────────────────────────────────
-- 3) RPC: la dueña solicita un cambio de plan
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.request_plan_change(
  p_plan plan_code,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant  uuid;
  v_current plan_code;
  v_id      uuid;
begin
  if auth.uid() is null then
    raise exception 'No autorizado';
  end if;
  -- Un super-admin de plataforma no tiene negocio: no aplica.
  if public.auth_is_platform_admin() then
    raise exception 'Un super-admin no solicita planes';
  end if;
  if not public.auth_is_owner() then
    raise exception 'Solo la dueña puede solicitar un cambio de plan';
  end if;

  v_tenant := public.auth_tenant_id();
  if v_tenant is null then
    raise exception 'Sin negocio asociado';
  end if;

  select plan into v_current from subscriptions where tenant_id = v_tenant;
  if v_current = p_plan then
    raise exception 'Ya tienes el plan solicitado';
  end if;

  -- Si ya hay una pendiente, la devolvemos (idempotente, sin duplicar).
  select id into v_id
  from plan_requests
  where tenant_id = v_tenant and status = 'pending'
  limit 1;

  if v_id is null then
    insert into plan_requests (tenant_id, requested_plan, note, requested_by)
    values (v_tenant, p_plan, nullif(btrim(p_note), ''), auth.uid())
    returning id into v_id;
  end if;

  return (
    select jsonb_build_object(
      'id', pr.id,
      'requested_plan', pr.requested_plan,
      'status', pr.status,
      'created_at', pr.created_at
    )
    from plan_requests pr where pr.id = v_id
  );
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4) RPC: el super-admin lista las solicitudes pendientes
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_plan_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  select coalesce(jsonb_agg(r_row order by created_at asc), '[]'::jsonb)
  into result
  from (
    select
      pr.created_at as created_at,
      jsonb_build_object(
        'id',             pr.id,
        'tenant_id',      pr.tenant_id,
        'tenant_name',    t.name,
        'requested_plan', pr.requested_plan,
        'current_plan',   s.plan,
        'status',         pr.status,
        'note',           pr.note,
        'created_at',     pr.created_at,
        'whatsapp',       t.whatsapp,
        'owner_name',     o.full_name,
        'owner_email',    au.email
      ) as r_row
    from plan_requests pr
    join tenants t on t.id = pr.tenant_id
    left join subscriptions s on s.tenant_id = pr.tenant_id
    left join lateral (
      select id, full_name
      from profiles
      where tenant_id = pr.tenant_id and role = 'owner'
      order by created_at asc
      limit 1
    ) o on true
    left join auth.users au on au.id = o.id
    where pr.status = 'pending'
  ) sub;

  return result;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 5) RPC: el super-admin aprueba (cambia el plan) o rechaza una solicitud
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.admin_resolve_plan_request(
  p_id      uuid,
  p_approve boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_plan   plan_code;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;

  -- Bloquea la fila y garantiza que solo se resuelve una vez (sin carrera).
  select tenant_id, requested_plan into v_tenant, v_plan
  from plan_requests
  where id = p_id and status = 'pending'
  for update;

  if v_tenant is null then
    raise exception 'Solicitud no encontrada o ya resuelta';
  end if;

  if p_approve then
    -- Cambia el plan (misma lógica idempotente que admin_set_subscription).
    insert into subscriptions (tenant_id, plan, status)
    values (v_tenant, v_plan, 'active')
    on conflict (tenant_id) do update
      set plan   = excluded.plan,
          status = 'active';
  end if;

  update plan_requests
  set status      = case when p_approve then 'approved' else 'rejected' end,
      resolved_at = now(),
      resolved_by = auth.uid()
  where id = p_id;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 6) Permisos de ejecución
-- ──────────────────────────────────────────────────────────────────────────
revoke all on function public.request_plan_change(plan_code, text)   from public;
revoke all on function public.admin_list_plan_requests()             from public;
revoke all on function public.admin_resolve_plan_request(uuid, boolean) from public;

grant execute on function public.request_plan_change(plan_code, text)   to authenticated;
grant execute on function public.admin_list_plan_requests()             to authenticated;
grant execute on function public.admin_resolve_plan_request(uuid, boolean) to authenticated;
