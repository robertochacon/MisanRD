-- ═══════════════════════════════════════════════════════════════════════════
-- MisanRD · 0004 · Storage (buckets + políticas)
-- ═══════════════════════════════════════════════════════════════════════════
-- Convención: los archivos se guardan bajo "<tenant_id>/..." para que las
-- políticas por carpeta aíslen el acceso por tenant.
--   logos        → público (se muestran en recibos y portal)
--   participants → privado (fotos, PII)
--   signatures   → privado (firmas de la administradora y de entregas)
--   receipts     → privado (comprobantes de transferencia / entrega)
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),
  ('participants', 'participants', false),
  ('signatures', 'signatures', false),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- ── logos (lectura pública; escritura del tenant dueño) ──────────────────────
drop policy if exists "logos public read" on storage.objects;
create policy "logos public read" on storage.objects
  for select using (bucket_id = 'logos');

drop policy if exists "logos tenant write" on storage.objects;
create policy "logos tenant write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth_tenant_id()::text);

drop policy if exists "logos tenant update" on storage.objects;
create policy "logos tenant update" on storage.objects
  for update to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth_tenant_id()::text);

drop policy if exists "logos tenant delete" on storage.objects;
create policy "logos tenant delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth_tenant_id()::text);

-- ── Buckets privados: acceso completo restringido a la carpeta del tenant ────
do $$
declare
  b text;
begin
  foreach b in array array['participants', 'signatures', 'receipts']
  loop
    execute format($f$
      drop policy if exists %1$I on storage.objects;
      create policy %1$I on storage.objects
        for all to authenticated
        using (bucket_id = %2$L and (storage.foldername(name))[1] = auth_tenant_id()::text)
        with check (bucket_id = %2$L and (storage.foldername(name))[1] = auth_tenant_id()::text);
    $f$, b || '_tenant_all', b);
  end loop;
end $$;
