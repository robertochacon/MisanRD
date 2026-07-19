-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0006 · Invitación de administradores (multi-admin, plan Premium)
-- ═══════════════════════════════════════════════════════════════════════════
-- Camino SEGURO para agregar un segundo administrador a un tenant existente,
-- sin reabrir el INSERT directo a profiles (cerrado en 0005). La dueña genera
-- un código de invitación; el nuevo usuario se registra y lo canjea vía RPC.
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.tenant_invites (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  code        text not null unique default encode(gen_random_bytes(9), 'hex'),
  email       text,
  role        member_role not null default 'admin',
  created_by  uuid references auth.users (id) on delete set null,
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists tenant_invites_tenant_idx on public.tenant_invites (tenant_id);
create index if not exists tenant_invites_code_idx on public.tenant_invites (code);

alter table public.tenant_invites enable row level security;

-- Los miembros del tenant ven y revocan sus invitaciones.
-- La creación va SIEMPRE por create_invite() (SECURITY DEFINER); no hay política
-- de INSERT/UPDATE para el cliente.
drop policy if exists invites_select on public.tenant_invites;
create policy invites_select on public.tenant_invites
  for select to authenticated using (tenant_id = auth_tenant_id());

drop policy if exists invites_delete on public.tenant_invites;
create policy invites_delete on public.tenant_invites
  for delete to authenticated using (tenant_id = auth_tenant_id());

-- ──────────────────────────────────────────────────────────────────────────
-- create_invite() — solo la dueña, solo en plan Premium
-- ──────────────────────────────────────────────────────────────────────────
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

-- ──────────────────────────────────────────────────────────────────────────
-- accept_invite() — el invitado (sin profile aún) canjea el código
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.tenant_invites;
  v_name text;
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;
  if exists (select 1 from profiles where id = v_uid) then
    raise exception 'Ya perteneces a una cuenta';
  end if;

  select * into v_inv from tenant_invites where code = trim(p_code);
  if not found then
    raise exception 'Código de invitación inválido';
  end if;
  if v_inv.accepted_at is not null then
    raise exception 'Este código ya fue utilizado';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'Este código de invitación expiró';
  end if;

  select raw_user_meta_data ->> 'full_name' into v_name from auth.users where id = v_uid;

  insert into profiles (id, tenant_id, full_name, role)
  values (v_uid, v_inv.tenant_id, v_name, v_inv.role);

  update tenant_invites
  set accepted_at = now(), accepted_by = v_uid
  where id = v_inv.id;

  return v_inv.tenant_id;
end;
$$;

grant execute on function public.create_invite(member_role, text) to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
