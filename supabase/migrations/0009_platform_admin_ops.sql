-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0009 · Operaciones de mantenimiento del super-admin de plataforma
-- ═══════════════════════════════════════════════════════════════════════════
-- Amplía el panel /admin con:
--   • Suspender / reactivar un negocio completo (bloquea sus escrituras).
--   • Gestionar los usuarios de cada negocio (rol, quitar, suspender login).
--   • Alta / baja de otros super-admins de plataforma desde la UI.
--   • Resumen por negocio para el detalle (drill-down).
--
-- Todas las RPCs son SECURITY DEFINER con guardia `auth_is_platform_admin()`.
-- Se preservan invariantes: >=1 dueña por tenant, >=1 super-admin, y la
-- ortogonalidad (un super-admin nunca tiene profile/tenant → 0008).
-- ═══════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────
-- 1) Suspensión de negocios
-- ──────────────────────────────────────────────────────────────────────────
alter table public.tenants add column if not exists suspended_at timestamptz;

-- Bloquea ESCRITURAS de un tenant suspendido (lectura sigue permitida). Se aplica
-- a las tablas operativas; las tablas generadas por el backend no se tocan porque
-- dependen de estas (si no puedes crear/editar sanes ni pagos, no se generan).
create or replace function public.block_write_if_tenant_suspended()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from public.tenants
    where id = coalesce(new.tenant_id, old.tenant_id) and suspended_at is not null
  ) then
    raise exception 'CUENTA_SUSPENDIDA: Este negocio está suspendido. Contacta al administrador de la plataforma.';
  end if;
  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
  tbls text[] := array['participants', 'sanes', 'san_participants', 'payments', 'deliveries', 'reminders', 'notifications', 'audit_logs'];
begin
  foreach t in array tbls loop
    execute format('drop trigger if exists trg_block_suspended on public.%I', t);
    execute format(
      'create trigger trg_block_suspended before insert or update or delete on public.%I '
      || 'for each row execute function public.block_write_if_tenant_suspended()',
      t
    );
  end loop;
end $$;

create or replace function public.admin_set_tenant_suspended(p_tenant uuid, p_suspended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  update public.tenants
    set suspended_at = case when p_suspended then now() else null end
  where id = p_tenant;
  if not found then
    raise exception 'Negocio no encontrado';
  end if;
end;
$$;

-- CRÍTICO (auditoría): sin esto, la dueña de un negocio suspendido podía hacer
-- `PATCH /tenants {suspended_at:null}` y auto-reactivarse (tenants_update de 0003
-- no restringe columnas). Este guard, espejo de profiles_guard:
--   • Impide que un cliente normal cambie suspended_at (solo el super-admin, vía
--     admin_set_tenant_suspended, que corre como platform admin).
--   • Congela TODA edición del negocio mientras está suspendido (name, banco, etc.).
create or replace function public.tenants_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.auth_is_platform_admin() then
    return new; -- el super-admin puede suspender/reactivar y editar
  end if;
  if new.suspended_at is distinct from old.suspended_at then
    raise exception 'No autorizado para cambiar el estado de suspensión del negocio';
  end if;
  if old.suspended_at is not null then
    raise exception 'CUENTA_SUSPENDIDA: Este negocio está suspendido. Contacta al administrador de la plataforma.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tenants_guard on public.tenants;
create trigger trg_tenants_guard
  before update on public.tenants
  for each row execute function public.tenants_guard();

-- ──────────────────────────────────────────────────────────────────────────
-- 2) profiles_guard con excepción para el super-admin
-- ──────────────────────────────────────────────────────────────────────────
-- El cliente normal NO puede cambiar tenant_id/role (invariante de 0005). El
-- super-admin SÍ (reasignar dueña, cambiar rol). auth.uid() dentro de una función
-- SECURITY DEFINER sigue siendo el del LLAMADOR, así que la guardia funciona.
create or replace function public.profiles_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.auth_is_platform_admin() then
    return new; -- el super-admin puede reasignar rol/tenant desde las RPCs admin_*
  end if;
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'No se permite cambiar el tenant de un perfil';
  end if;
  if new.role is distinct from old.role then
    raise exception 'No se permite cambiar el rol desde el cliente';
  end if;
  return new;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 3) Gestión de usuarios por negocio
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_members(p_tenant uuid)
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
  select coalesce(jsonb_agg(
           jsonb_build_object(
             'id',         p.id,
             'full_name',  p.full_name,
             'role',       p.role,
             'created_at', p.created_at,
             'email',      u.email,
             'banned',     (u.banned_until is not null and u.banned_until > now())
           )
           order by (p.role = 'owner') desc, p.created_at
         ), '[]'::jsonb)
  into result
  from public.profiles p
  left join auth.users u on u.id = p.id
  where p.tenant_id = p_tenant;
  return result;
end;
$$;

create or replace function public.admin_set_member_role(p_user uuid, p_role member_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_owners int;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  select tenant_id into v_tenant from public.profiles where id = p_user;
  if v_tenant is null then
    raise exception 'Usuario no encontrado';
  end if;
  -- Serializa las operaciones de membresía del MISMO tenant (evita write-skew:
  -- dos degradaciones concurrentes que dejarían 0 dueñas).
  perform pg_advisory_xact_lock(hashtext('misanrd_owner:' || v_tenant::text));
  update public.profiles set role = p_role where id = p_user;
  -- Invariante verificado DESPUÉS del cambio (rollback si el negocio queda sin dueña).
  select count(*) into v_owners from public.profiles where tenant_id = v_tenant and role = 'owner';
  if v_owners < 1 then
    raise exception 'No puedes dejar al negocio sin dueña; asigna otra dueña primero';
  end if;
end;
$$;

create or replace function public.admin_remove_member(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_owners int;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  select tenant_id into v_tenant from public.profiles where id = p_user;
  if v_tenant is null then
    raise exception 'Usuario no encontrado';
  end if;
  -- Serializa las operaciones de membresía del MISMO tenant (evita write-skew).
  perform pg_advisory_xact_lock(hashtext('misanrd_owner:' || v_tenant::text));
  -- Quita al usuario del negocio (borra su profile). NO borra su cuenta de login.
  delete from public.profiles where id = p_user;
  -- Invariante verificado DESPUÉS (rollback si quedó sin dueña).
  select count(*) into v_owners from public.profiles where tenant_id = v_tenant and role = 'owner';
  if v_owners < 1 then
    raise exception 'No puedes quitar a la única dueña; reasigna la dueña primero';
  end if;
end;
$$;

-- Suspender / reactivar el LOGIN de un usuario (banned_until en GoTrue).
create or replace function public.admin_set_user_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  if exists (select 1 from public.platform_admins where user_id = p_user) then
    raise exception 'No puedes suspender el login de un super-admin';
  end if;
  update auth.users
    set banned_until = case when p_banned then now() + interval '100 years' else null end
  where id = p_user;
  if not found then
    raise exception 'Usuario no encontrado';
  end if;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 4) Gestión de super-admins de plataforma
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.admin_list_platform_admins()
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
  select coalesce(jsonb_agg(
           jsonb_build_object('user_id', pa.user_id, 'email', u.email, 'note', pa.note, 'created_at', pa.created_at)
           order by pa.created_at
         ), '[]'::jsonb)
  into result
  from public.platform_admins pa
  left join auth.users u on u.id = pa.user_id;
  return result;
end;
$$;

create or replace function public.admin_grant_platform_admin(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  select id into v_uid from auth.users where lower(email) = lower(trim(p_email));
  if v_uid is null then
    raise exception 'No existe un usuario con ese correo (créalo primero en Auth)';
  end if;
  -- Preserva la ortogonalidad: un super-admin es una cuenta SIN negocio.
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Ese usuario pertenece a un negocio; un super-admin debe ser una cuenta sin negocio';
  end if;
  insert into public.platform_admins (user_id, note) values (v_uid, 'alta desde panel')
  on conflict (user_id) do nothing;
  return v_uid;
end;
$$;

create or replace function public.admin_revoke_platform_admin(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if not public.auth_is_platform_admin() then
    raise exception 'No autorizado';
  end if;
  -- Serializa las bajas de super-admin (evita que dos concurrentes dejen 0).
  perform pg_advisory_xact_lock(hashtext('misanrd_platform_admins'));
  delete from public.platform_admins where user_id = p_user;
  -- Invariante verificado DESPUÉS (rollback si quedaría en 0).
  select count(*) into v_count from public.platform_admins;
  if v_count < 1 then
    raise exception 'No puedes eliminar al único super-admin de la plataforma';
  end if;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 5) Resumen por negocio (para el detalle / drill-down)
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.admin_tenant_summary(p_tenant uuid)
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
    'active_sanes',        (select count(*) from sanes where tenant_id = p_tenant and status = 'active'),
    'completed_sanes',     (select count(*) from sanes where tenant_id = p_tenant and status = 'completed'),
    'draft_sanes',         (select count(*) from sanes where tenant_id = p_tenant and status = 'draft'),
    'total_participants',  (select count(*) from participants where tenant_id = p_tenant),
    'pending_amount',      (select coalesce(sum(amount - paid_amount), 0) from installments where tenant_id = p_tenant and status <> 'paid'),
    'collected_total',     (select coalesce(sum(amount), 0) from payments where tenant_id = p_tenant),
    'overdue_installments',(select count(*) from installments where tenant_id = p_tenant and status <> 'paid' and due_date < current_date),
    'morosos_count',       (select count(distinct participant_id) from installments where tenant_id = p_tenant and status <> 'paid' and due_date < current_date)
  ) into result;
  return result;
end;
$$;

-- ──────────────────────────────────────────────────────────────────────────
-- 6) admin_list_tenants() — agregar bandera `suspended`
-- ──────────────────────────────────────────────────────────────────────────
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
        'suspended',       (t.suspended_at is not null),
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

-- ──────────────────────────────────────────────────────────────────────────
-- 7) Permisos
-- ──────────────────────────────────────────────────────────────────────────
do $$
declare
  f text;
  fns text[] := array[
    'public.admin_set_tenant_suspended(uuid, boolean)',
    'public.admin_list_members(uuid)',
    'public.admin_set_member_role(uuid, member_role)',
    'public.admin_remove_member(uuid)',
    'public.admin_set_user_banned(uuid, boolean)',
    'public.admin_list_platform_admins()',
    'public.admin_grant_platform_admin(text)',
    'public.admin_revoke_platform_admin(uuid)',
    'public.admin_tenant_summary(uuid)'
  ];
begin
  foreach f in array fns loop
    execute format('revoke all on function %s from public', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 8) Congelar invitaciones de negocios suspendidos
-- ──────────────────────────────────────────────────────────────────────────
-- Re-creación fiel de create_invite (0006) y accept_invite (0007+0008) con una
-- guardia adicional: no operar sobre un tenant suspendido.
create or replace function public.create_invite(
  p_role member_role default 'admin',
  p_email text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_tenant uuid;
  v_role   member_role;
  v_plan   plan_code;
  v_code   text;
begin
  select tenant_id, role into v_tenant, v_role from profiles where id = v_uid;
  if v_tenant is null then
    raise exception 'No autorizado';
  end if;
  if exists (select 1 from tenants where id = v_tenant and suspended_at is not null) then
    raise exception 'CUENTA_SUSPENDIDA: Este negocio está suspendido.';
  end if;
  if v_role <> 'owner' then
    raise exception 'Solo la dueña de la cuenta puede invitar administradores';
  end if;
  select plan into v_plan from subscriptions where tenant_id = v_tenant;
  if v_plan <> 'premium' then
    raise exception 'PLAN_LIMIT_ADMINS: Los administradores adicionales requieren el plan Premium.';
  end if;
  insert into tenant_invites (tenant_id, role, email, created_by)
  values (v_tenant, coalesce(p_role, 'admin'), nullif(trim(p_email), ''), v_uid)
  returning code into v_code;
  return v_code;
end;
$$;

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
  if exists (select 1 from tenants where id = v_inv.tenant_id and suspended_at is not null) then
    raise exception 'CUENTA_SUSPENDIDA: Este negocio está suspendido.';
  end if;

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
