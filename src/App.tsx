import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { lazy, Suspense, type ReactNode } from 'react'
import { useAuth } from '@/auth/AuthProvider'
import { Layout } from '@/components/Layout'
import { Logo } from '@/components/Logo'
import { Spinner } from '@/components/ui/misc'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { OnboardingPage } from '@/pages/auth/OnboardingPage'

// Rutas de la app protegida: carga diferida (code-splitting) para un bundle liviano.
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const SanesListPage = lazy(() => import('@/features/sanes/SanesListPage').then((m) => ({ default: m.SanesListPage })))
const SanCreatePage = lazy(() => import('@/features/sanes/SanCreatePage').then((m) => ({ default: m.SanCreatePage })))
const SanDetailPage = lazy(() => import('@/features/sanes/SanDetailPage').then((m) => ({ default: m.SanDetailPage })))
const ParticipantsPage = lazy(() => import('@/features/participants/ParticipantsPage').then((m) => ({ default: m.ParticipantsPage })))
const PaymentsPage = lazy(() => import('@/features/payments/PaymentsPage').then((m) => ({ default: m.PaymentsPage })))
const MorososPage = lazy(() => import('@/features/morosos/MorososPage').then((m) => ({ default: m.MorososPage })))
const DeliveriesPage = lazy(() => import('@/features/deliveries/DeliveriesPage').then((m) => ({ default: m.DeliveriesPage })))
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const PortalPage = lazy(() => import('@/features/portal/PortalPage').then((m) => ({ default: m.PortalPage })))
const AdminPage = lazy(() => import('@/features/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const AdminTenantDetail = lazy(() => import('@/features/admin/AdminTenantDetail').then((m) => ({ default: m.AdminTenantDetail })))

function FullLoader() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50">
      <Logo className="h-16 w-16 animate-pulse" />
      <Spinner />
    </div>
  )
}

/** Solo para usuarios NO autenticados (login/registro). */
function PublicOnly({ children }: { children: ReactNode }) {
  const { loading, user, needsOnboarding, isPlatformAdmin } = useAuth()
  if (loading) return <FullLoader />
  if (user) {
    const to = isPlatformAdmin ? '/admin' : needsOnboarding ? '/bienvenida' : '/'
    return <Navigate to={to} replace />
  }
  return <>{children}</>
}

/** Pantalla de bloqueo para negocios suspendidos por la plataforma. */
function SuspendedScreen() {
  const { tenant, signOut } = useAuth()
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
      <Logo className="h-14 w-14 opacity-70" />
      <h1 className="text-lg font-bold text-slate-900">Cuenta suspendida</h1>
      <p className="max-w-sm text-sm text-slate-500">
        El acceso a <span className="font-medium">{tenant?.name}</span> está temporalmente suspendido.
        Contacta al administrador de la plataforma para reactivarlo.
      </p>
      <button onClick={() => signOut()} className="text-sm font-medium text-brand-600 hover:underline">
        Cerrar sesión
      </button>
    </div>
  )
}

/** Requiere sesión + tenant configurado. */
function ProtectedLayout() {
  const { loading, user, needsOnboarding, isPlatformAdmin, tenant } = useAuth()
  if (loading) return <FullLoader />
  if (!user) return <Navigate to="/login" replace />
  // Super-admin sin negocio propio → su lugar es el panel de plataforma.
  if (isPlatformAdmin && !tenant) return <Navigate to="/admin" replace />
  if (needsOnboarding) return <Navigate to="/bienvenida" replace />
  if (tenant?.suspended_at) return <SuspendedScreen />
  return <Layout />
}

/** Requiere sesión + ser super-admin de plataforma. */
function RequirePlatformAdmin({ children }: { children: ReactNode }) {
  const { loading, user, isPlatformAdmin } = useAuth()
  if (loading) return <FullLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!isPlatformAdmin) return <Navigate to="/" replace />
  return <>{children}</>
}

/** Paso de onboarding (sesión sin tenant). */
function OnboardingGuard() {
  const { loading, user, needsOnboarding } = useAuth()
  if (loading) return <FullLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!needsOnboarding) return <Navigate to="/" replace />
  return <OnboardingPage />
}

export default function App() {
  return (
    <HashRouter>
      <Suspense fallback={<FullLoader />}>
      <Routes>
        {/* Público */}
        <Route path="/portal/:token" element={<PortalPage />} />
        <Route path="/verifica-correo" element={<VerifyEmailPage />} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/registro" element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/bienvenida" element={<OnboardingGuard />} />

        {/* Panel de plataforma (super-admin, cross-tenant) */}
        <Route path="/admin" element={<RequirePlatformAdmin><AdminPage /></RequirePlatformAdmin>} />
        <Route path="/admin/negocio/:id" element={<RequirePlatformAdmin><AdminTenantDetail /></RequirePlatformAdmin>} />

        {/* App protegida */}
        <Route element={<ProtectedLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="sanes" element={<SanesListPage />} />
          <Route path="sanes/nuevo" element={<SanCreatePage />} />
          <Route path="sanes/:id" element={<SanDetailPage />} />
          <Route path="participantes" element={<ParticipantsPage />} />
          <Route path="pagos" element={<PaymentsPage />} />
          <Route path="morosos" element={<MorososPage />} />
          <Route path="entregas" element={<DeliveriesPage />} />
          <Route path="reportes" element={<ReportsPage />} />
          <Route path="configuracion" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </HashRouter>
  )
}
