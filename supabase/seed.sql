-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · seed (datos demo para desarrollo local)
-- Se ejecuta con `supabase db reset` / `supabase start`.
-- Crea un admin de prueba:  demo@misanrd.com  /  demo1234
-- Si tu versión de Supabase falla al insertar en auth.*, comenta ese bloque
-- y regístrate normalmente desde la app.
-- ═══════════════════════════════════════════════════════════════════════════

-- IDs fijos para poder re-ejecutar de forma idempotente
-- usuario:  11111111-1111-1111-1111-111111111111
-- tenant:   22222222-2222-2222-2222-222222222222

-- ── Usuario de auth ─────────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated', 'authenticated', 'demo@misanrd.com',
  crypt('demo1234', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"María (Demo)"}',
  false
)
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
)
values (
  gen_random_uuid(),
  '11111111-1111-1111-1111-111111111111',
  '{"sub":"11111111-1111-1111-1111-111111111111","email":"demo@misanrd.com"}',
  'email', '11111111-1111-1111-1111-111111111111',
  now(), now(), now()
)
on conflict do nothing;

-- ── Tenant + profile + subscription (Premium para la demo) ───────────────────
insert into public.tenants (id, name, whatsapp, currency, created_by)
values (
  '22222222-2222-2222-2222-222222222222',
  'Sanes de María', '18095551234', 'DOP',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into public.profiles (id, tenant_id, full_name, role)
values (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'María (Demo)', 'owner'
)
on conflict (id) do nothing;

insert into public.subscriptions (tenant_id, plan, status)
values ('22222222-2222-2222-2222-222222222222', 'premium', 'active')
on conflict (tenant_id) do nothing;

-- ── Participantes ────────────────────────────────────────────────────────────
insert into public.participants (id, tenant_id, full_name, phone, whatsapp, status)
values
  ('a0000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'Juan Pérez',    '18095550001', '18095550001', 'active'),
  ('a0000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Pedro Gómez',   '18095550002', '18095550002', 'active'),
  ('a0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'María Santos',  '18095550003', '18095550003', 'active'),
  ('a0000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'Rosa Díaz',     '18095550004', '18095550004', 'active'),
  ('a0000000-0000-0000-0000-000000000005', '22222222-2222-2222-2222-222222222222', 'Ana Reyes',     '18095550005', '18095550005', 'active')
on conflict (id) do nothing;

-- ── Un San semanal de RD$500 con 5 participantes ─────────────────────────────
insert into public.sanes (id, tenant_id, name, description, contribution_amount, frequency, participant_count, start_date, order_type, status, created_by)
values (
  'b0000000-0000-0000-0000-000000000001',
  '22222222-2222-2222-2222-222222222222',
  'San Navidad', 'San semanal del grupo', 500, 'weekly', 5,
  current_date - interval '14 days', 'manual', 'draft',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

insert into public.san_participants (tenant_id, san_id, participant_id, position)
values
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1),
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 2),
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 3),
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 4),
  ('22222222-2222-2222-2222-222222222222', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 5)
on conflict do nothing;

-- ── Generar cronograma (sin pasar por la RPC, que exige auth.uid()) ──────────
do $$
declare
  v_san public.sanes;
  v_n int;
  v_pot numeric(12,2);
  r record;
  v_date date;
begin
  select * into v_san from public.sanes where id = 'b0000000-0000-0000-0000-000000000001';
  if v_san.status <> 'draft' then return; end if;

  select count(*) into v_n from public.san_participants where san_id = v_san.id;
  v_pot := v_san.contribution_amount * v_n;

  for r in
    select position, participant_id from public.san_participants where san_id = v_san.id order by position
  loop
    v_date := public.san_period_date(v_san.start_date, v_san.frequency, r.position);
    insert into public.payout_schedule (tenant_id, san_id, period_number, scheduled_date, recipient_participant_id, expected_amount)
    values (v_san.tenant_id, v_san.id, r.position, v_date, r.participant_id, v_pot);
    insert into public.installments (tenant_id, san_id, san_participant_id, participant_id, period_number, due_date, amount)
    select v_san.tenant_id, v_san.id, sp.id, sp.participant_id, r.position, v_date, v_san.contribution_amount
    from public.san_participants sp where sp.san_id = v_san.id;
  end loop;

  update public.sanes set status = 'active' where id = v_san.id;
end $$;

-- ── Algunos pagos del período 1 (los triggers calculan estado + recibo) ──────
insert into public.payments (tenant_id, san_id, installment_id, participant_id, amount, paid_at, method)
select i.tenant_id, i.san_id, i.id, i.participant_id, i.amount, i.due_date, 'cash'
from public.installments i
where i.san_id = 'b0000000-0000-0000-0000-000000000001'
  and i.period_number = 1
  and i.participant_id in (
    'a0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000003'
  );
