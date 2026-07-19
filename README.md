# MisanRD — Tus sans, más fácil 🇩🇴

Plataforma **SaaS multi-tenant** para administrar Sanes (SUSU) desde el celular o
la computadora: participantes, cronograma automático, cobros, morosos, entregas,
recibos PDF y un **portal para cada participante**.

- **Frontend:** React + Vite + TypeScript + Tailwind + PWA → **GitHub Pages**
- **Backend:** **Supabase** (PostgreSQL + Auth + Storage + RLS + Edge Functions)
- **WhatsApp:** enlaces `wa.me` (recordatorios, avisos y recibos, sin servidor)

---

## ✨ Funcionalidades (MVP)

- **Dashboard** con métricas: Sanes activos, participantes, cobrado hoy, por cobrar, morosos, próxima entrega.
- **Sanes:** crear con orden de entrega **manual o aleatorio**, cronograma generado automáticamente, detalle con cronograma e historial por participante.
- **Participantes:** registro completo + **enlace de portal personal** por cada uno.
- **Pagos:** registro rápido de cuotas, parciales, métodos (efectivo, transferencia, Yape, banco).
- **Morosos:** lista automática por cuotas vencidas, con recordatorio por WhatsApp.
- **Entregas:** registrar entrega del dinero con fecha, hora y comprobante; cierre automático del San.
- **Recibos PDF** con **código QR** + envío por WhatsApp.
- **Reportes** con gráficas + exportar a **Excel** (según plan).
- **Portal del participante:** ve cuánto pagó, cuánto debe, cuándo recibe y descarga recibos (solo lectura, por token seguro).
- **Planes** (Básico / Emprendedora / Premium) con límites aplicados en la app **y** en la base de datos.
- **Multi-administrador (Premium):** invita a otras personas a gestionar la misma cuenta con un código seguro (Configuración → Administradores).
- **PWA** instalable + offline básico.

---

## 🚀 Puesta en marcha

### 1) Requisitos

- Node 20+
- Una cuenta en [Supabase](https://supabase.com)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)

### 2) Instalar y generar íconos

```bash
npm install
npm run icons        # genera íconos PWA/favicon desde MisanRD.png
```

### 3) Configurar Supabase

**Opción A — proyecto en la nube (recomendado para producción):**

1. Crea un proyecto en Supabase.
2. Enlaza el CLI y aplica las migraciones:
   ```bash
   supabase link --project-ref TU_PROJECT_REF
   supabase db push
   ```
3. Despliega la Edge Function del portal:
   ```bash
   supabase functions deploy portal --no-verify-jwt
   ```
4. En **Authentication → URL Configuration**, agrega tu URL de GitHub Pages
   (`https://TU-USUARIO.github.io/MisanRD/`) a *Redirect URLs* y *Site URL*.
5. (Opcional) Activa/desactiva la confirmación de correo en **Authentication → Providers → Email**.

**Opción B — local (requiere Docker):**

```bash
supabase start      # aplica migraciones + seed (usuario demo: demo@misanrd.com / demo1234)
```

### 4) Variables de entorno

```bash
cp .env.example .env
```

Completa con los valores de tu proyecto (**Settings → API**):

```
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_PUBLIC_URL=https://TU-USUARIO.github.io/MisanRD/
```

### 5) Desarrollo

```bash
npm run dev
```

Abre el enlace que muestra Vite (se sirve bajo `/MisanRD/`).

---

## 📦 Deploy a GitHub Pages

El repo incluye `.github/workflows/deploy.yml` que compila y publica en cada push a `main`.

1. Sube el proyecto a un repo llamado **MisanRD**.
2. En **Settings → Pages → Build and deployment**, elige **Source: GitHub Actions**.
3. En **Settings → Secrets and variables → Actions**, crea los secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_PUBLIC_URL` → `https://TU-USUARIO.github.io/MisanRD/`
   - *(opcional)* `VITE_BASE` → `/` si usas dominio propio o user/org page.
4. Haz `git push` a `main`. El sitio quedará en `https://TU-USUARIO.github.io/MisanRD/`.

> **Dominio propio:** agrega `VITE_BASE=/` como secret y un archivo `public/CNAME`
> con tu dominio. Recuerda actualizar `VITE_PUBLIC_URL`.

---

## 🔐 Multi-tenancy y seguridad

- Cada administradora es un **tenant**. Todo dato lleva `tenant_id`.
- **Row Level Security (RLS)** garantiza que un usuario solo ve/edita datos de su tenant, a través de la función `auth_tenant_id()`.
- Tablas generadas por el sistema (cuotas, cronograma, recibos, tokens de portal) son **solo lectura** para el cliente; las escribe el backend con funciones `SECURITY DEFINER`.
- El **portal del participante** usa una Edge Function con la `service_role` key (solo del lado del servidor); el navegador nunca la ve. El acceso se valida por token único de 128 bits, **revocable**: desde Participantes puedes *Regenerar enlace* para invalidar el anterior al instante.
- `tenant_id` y `role` en `profiles` son **inmutables** vía cliente (trigger), y pagos/entregas validan que todos sus IDs pertenezcan al mismo tenant. Ver `0005_security_hardening.sql`.

---

## 🧮 Cómo funciona el San

Con **N** participantes y cuota **C**:

- Se generan **N períodos**. En el período *p*, **todos** aportan la cuota `C` y quien está en el turno *p* **recibe** el bote `C × N`.
- Las fechas se calculan según la frecuencia (diario / semanal / quincenal / mensual) desde la fecha de inicio.
- Total aportado = total entregado = `C × N²` (queda balanceado).

---

## 🗂️ Estructura

```
supabase/
  migrations/    0001 esquema · 0002 funciones/triggers · 0003 RLS · 0004 storage
                 · 0005 endurecimiento de seguridad · 0006 invitación de admins
  functions/portal/   Edge Function del portal del participante
  seed.sql       datos demo
src/
  lib/           supabase, formato RD$, cronograma, whatsapp, qr, storage
  auth/          AuthProvider (sesión + tenant + plan)
  components/    UI kit, Layout (sidebar + bottom-nav), badges
  hooks/         react-query por dominio
  features/      dashboard, sanes, participants, payments, morosos,
                 deliveries, reports, receipts, portal, settings
  pages/auth/    login, registro, verificación, onboarding
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (`dist/`) |
| `npm run icons` | Genera íconos PWA desde `MisanRD.png` |
| `npm run db:push` | Aplica migraciones al proyecto enlazado |
| `npm run types:gen` | Regenera tipos TS desde la BD local |

---

## ⚠️ Limitaciones conocidas / próximos pasos

- **Suscripciones:** el plan se guarda y sus límites se aplican, pero el cambio de plan es manual (sin pasarela de pago).
- **WhatsApp:** vía enlaces `wa.me` (el envío lo confirma la persona). Para envío automático, migrar a Meta Cloud API / Evolution con una Edge Function.
- **Offline:** cacheo básico del shell (PWA). El modo offline completo con cola de escritura es trabajo futuro.

---

Hecho con 💙 para las administradoras de sanes de RD.
