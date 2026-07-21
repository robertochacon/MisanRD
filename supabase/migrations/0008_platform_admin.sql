-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0008 · Super-admin de PLATAFORMA (acceso cross-tenant)
-- ═══════════════════════════════════════════════════════════════════════════
-- Introduce un rol ORTOGONAL al modelo de tenants: el super-admin de plataforma.
-- No pertenece a ningún negocio; puede LEER todos los tenants (soporte, auditoría)
-- y ejecutar RPCs administrativas acotadas (cambiar plan/estado de suscripción).
--
-- INVARIANTE DE SEGURIDAD (no se debilita el aislamiento multi-tenant):
--   • Las políticas nuevas son PERMISIVAS y su predicado es auth_is_platform_admin(),
--     que es FALSE para todo usuario que no esté en public.platform_admins. Un
--     usuario normal ve exactamente lo mismo que antes (su tenant y nada más).
--   • No se crea NINGÚN camino de escritura cross-tenant vía políticas: las nuevas
--     políticas son SOLO SELECT. Las mutaciones administrativas van por RPCs
--     SECURITY DEFINER con guardia explícita.
--   • platform_admins NO tiene política de INSERT/UPDATE/DELETE → ningún cliente
--     (ni siquiera otro platform admin) puede auto-promoverse. El alta se hace
--     exclusivamente vía service_role / SQL (ver scripts/grant-platform-admin.sql).
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1) Registro de super-admins de plataforma
-- ──────────────────────────────────────────────────────────────────────────
create table if not exists public.platform_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

-- ──────────────────────────────────────────────────────────────────────────
-- 2) Predicado base: ¿el usuario actual es super-admin de plataforma?
-- SECURITY DEFINER para leer platform_admins sin recursión de RLS.
-- STABLE + búsqueda por PK → costo despreciable aunque se evalúe por fila.
-- Devuelve FALSE para anon (auth.uid() = null) y para cualquier no-admin.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.auth_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_admins where user_id = auth.uid()
  )
$$;

revoke all on function public.auth_is_platform_admin() from public;
grant execute on function public.auth_is_platform_admin() to authenticated, anon;

-- platform_admins: los admins ven el listado; NADIE escribe desde el cliente.
drop policy if exists platform_admins_select on public.platform_admins;
create policy platform_admins_select on public.platform_admins
  for select to authenticated using (public.auth_is_platform_admin());
-- (sin políticas de insert/update/delete → escritura denegada para authenticated/anon)

-- ──────────────────────────────────────────────────────────────────────────
-- 3) Lectura cross-tenant para el super-admin (políticas PERMISIVAS, SOLO SELECT)
-- Se agregan encima de las políticas por-tenant existentes: el acceso queda como
-- (fila del propio tenant)  OR  (soy super-admin de plataforma SIN tenant propio).
--
-- El predicado incluye `auth_tenant_id() is null` para preservar la ortogonalidad
-- del rol: un super-admin es un principal SIN negocio (auth_tenant_id() = null).
-- Así, aunque por error se promoviera a una dueña con tenant, NO vería datos de
-- otros negocios mezclados en la app operativa (solo seguiría viendo el suyo);
-- el panel /admin sigue funcionando porque usa RPCs SECURITY DEFINER, no RLS.
--
-- EXCLUIDAS a propósito (mínimo privilegio sobre secretos bearer):
--   • tenant_invites            → columna `code` = credencial para unirse a un tenant.
--   • participant_portal_tokens → columna `token` = credencial del portal público.
-- El super-admin no las necesita para soporte/auditoría y exponerlas ampliaría la
-- superficie ante un compromiso de su sesión.
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  t text;
  tbls text[] := array[
    'tenants', 'profiles', 'subscriptions', 'participants', 'sanes',
    'san_participants', 'payout_schedule', 'installments', 'payments',
    'deliveries', 'receipts', 'reminders', 'notifications', 'audit_logs'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists %I on public.%I', t || '_platform_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated '
      || 'using (public.auth_is_platform_admin() and public.auth_tenant_id() is null)',
      t || '_platform_select', t
    );
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4) RPCs administrativas (SECURITY DEFINER con guardia auth_is_platform_admin)
-- ──────────────────────────────────────────────────────────────────────────

-- 4.a) Métricas globales de la plataforma
create or replace function public.admin_overview()
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

  select jsonb_build_object(
    'tenants',         (select count(*) from tenants),
    'members',         (select count(*) from profiles),
    'participants',    (select count(*) from participants),
    'active_sanes',    (select count(*) from sanes where status = 'active'),
    'total_sanes',     (select count(*) from sanes),
    'collected_total', (select coalesce(sum(amount), 0) from payments),
    'platform_admins', (select count(*) from platform_admins),
    'by_plan', (
      select coalesce(jsonb_object_agg(plan_txt, c), '{}'::jsonb)
      from (select plan::text as plan_txt, count(*) c from subscriptions group by plan) q
    ),
    'by_status', (
      select coalesce(jsonb_object_agg(status_txt, c), '{}'::jsonb)
      from (select status::text as status_txt, count(*) c from subscriptions group by status) q
    )
  ) into result;

  return result;
end;
$$;

-- 4.b) Listado de todos los negocios con métricas y dueña
create or replace function public.admin_list_tenants()
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

  select coalesce(jsonb_agg(t_row order by created_at desc), '[]'::jsonb)
  into result
  from (
    select
      t.created_at as created_at,
      jsonb_build_object(
        'id',              t.id,
        'name',            t.name,
        'created_at',      t.created_at,
        'whatsapp',        t.whatsapp,
        'currency',        t.currency,
        'plan',            s.plan,
        'sub_status',      s.status,
        'trial_ends_at',   s.trial_ends_at,
        'owner_name',      o.full_name,
        'owner_email',     au.email,
        'members',         (select count(*) from profiles pr where pr.tenant_id = t.id),
        'participants',    (select count(*) from participants p where p.tenant_id = t.id),
        'active_sanes',    (select count(*) from sanes sn where sn.tenant_id = t.id and sn.status = 'active'),
        'total_sanes',     (select count(*) from sanes sn where sn.tenant_id = t.id),
        'collected_total', (select coalesce(sum(pay.amount), 0) from payments pay where pay.tenant_id = t.id)
      ) as t_row
    from tenants t
    left join subscriptions s on s.tenant_id = t.id
    left join lateral (
      select id, full_name
      from profiles
      where tenant_id = t.id and role = 'owner'
      order by created_at asc
      limit 1
    ) o on true
    left join auth.users au on au.id = o.id
  ) sub;

  return result;
end;
$$;

-- 4.c) Cambiar plan / estado de suscripción de cualquier tenant
create or replace function public.admin_set_subscription(
  p_tenant uuid,
  p_plan   plan_code,
  p_status subscription_status default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  if not exists (select 1 from tenants where id = p_tenant) then
    raise exception 'Negocio no encontrado';
  end if;

  insert into subscriptions (tenant_id, plan, status)
  values (p_tenant, p_plan, coalesce(p_status, 'active'))
  on conflict (tenant_id) do update
    set plan   = excluded.plan,
        status = coalesce(p_status, subscriptions.status);
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 5) Permisos de ejecución
-- ──────────────────────────────────────────────────────────────────────────
revoke all on function public.admin_overview()                                   from public;
revoke all on function public.admin_list_tenants()                               from public;
revoke all on function public.admin_set_subscription(uuid, plan_code, subscription_status) from public;

grant execute on function public.admin_overview()                                   to authenticated;
grant execute on function public.admin_list_tenants()                               to authenticated;
grant execute on function public.admin_set_subscription(uuid, plan_code, subscription_status) to authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 6) Ortogonalidad del rol: un super-admin NUNCA obtiene profile/tenant
-- ──────────────────────────────────────────────────────────────────────────
-- Defensa en profundidad: se redefinen los dos únicos caminos que crean un
-- profile (onboarding y canje de invitación) para que rechacen a un super-admin.
-- Con esto auth_tenant_id() siempre es null para él → no puede escalar a
-- lectura/escritura de un tenant, aunque un código de invitación se filtrara.
-- (Espejo exacto de las funciones en 0002 / 0007 + la guardia nueva.)

-- 6.a) setup_tenant() — igual que en 0002, con guardia anti super-admin
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
  if public.auth_is_platform_admin() then
    raise exception 'Un super-admin de plataforma no puede crear ni pertenecer a un negocio';
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

-- 6.b) accept_invite() — igual que en 0007, con guardia anti super-admin
create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_inv     public.tenant_invites;
  v_name    text;
  v_claimed int;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if public.auth_is_platform_admin() then
    raise exception 'Un super-admin de plataforma no puede canjear invitaciones';
  end if;
  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'Ya perteneces a una cuenta';
  end if;

  select * into v_inv from tenant_invites where code = trim(p_code);
  if not found then
    raise exception 'Código de invitación inválido';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Este código de invitación expiró';
  end if;

  -- Reclamo atómico: solo tiene éxito si aún no fue aceptado.
  update tenant_invites
  set accepted_at = now(), accepted_by = v_uid
  where id = v_inv.id and accepted_at is null;
  get diagnostics v_claimed = row_count;
  if v_claimed = 0 then
    raise exception 'Este código ya fue utilizado';
  end if;

  select raw_user_meta_data ->> 'full_name' into v_name from auth.users where id = v_uid;

  insert into profiles (id, tenant_id, full_name, role)
  values (v_uid, v_inv.tenant_id, v_name, v_inv.role);

  return v_inv.tenant_id;
end;
$$;
