-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · Alta de super-admin de plataforma
-- ═══════════════════════════════════════════════════════════════════════════
-- Ejecutar en el SQL Editor de Supabase (rol postgres) o con service_role,
-- DESPUÉS de que el usuario de auth exista (créalo en Auth → Users, con
-- "Auto Confirm User"). Es idempotente.
--
-- Cambia el correo si necesitas dar de alta a otra persona.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.platform_admins (user_id, note)
select id, 'super-admin'
from auth.users
where lower(email) = lower('rchaconalcantara@gmail.com')
on conflict (user_id) do nothing;

-- Verificación: debe listar el correo.
select pa.user_id, u.email, pa.created_at
from public.platform_admins pa
join auth.users u on u.id = pa.user_id;
