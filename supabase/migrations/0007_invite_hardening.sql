-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0007 · Endurecimiento del flujo de invitaciones
-- Cierra las salvedades de baja severidad de la auditoría:
--  · Canje ATÓMICO del código (evita doble uso en carrera).
--  · La gestión/lectura de códigos queda restringida a la DUEÑA (no a admins).
-- ═══════════════════════════════════════════════════════════════════════════

-- ¿El usuario actual es dueño de su tenant? (definer → sin recursión de RLS)
create or replace function public.auth_is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'owner' from public.profiles where id = auth.uid()), false)
$$;
grant execute on function public.auth_is_owner() to authenticated;

-- Solo la dueña ve/revoca invitaciones (el código no queda expuesto a admins).
drop policy if exists invites_select on public.tenant_invites;
create policy invites_select on public.tenant_invites
  for select to authenticated
  using (tenant_id = auth_tenant_id() and auth_is_owner());

drop policy if exists invites_delete on public.tenant_invites;
create policy invites_delete on public.tenant_invites
  for delete to authenticated
  using (tenant_id = auth_tenant_id() and auth_is_owner());

-- ──────────────────────────────────────────────────────────────────────────
-- accept_invite() — canje atómico: el UPDATE condicional reclama el código;
-- si otro lo tomó primero, filas afectadas = 0 → se aborta. Todo en una sola
-- transacción, así que si el INSERT en profiles falla, se revierte el canje.
-- ──────────────────────────────────────────────────────────────────────────
create or replace function public.accept_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_inv    public.tenant_invites;
  v_name   text;
  v_claimed int;
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
