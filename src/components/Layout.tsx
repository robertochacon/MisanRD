import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Coins,
  Users,
  Wallet,
  AlertTriangle,
  PackageCheck,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useAuth } from '@/auth/AuthProvider'
import { Wordmark } from '@/components/Logo'
import { OfflineBar } from '@/components/OfflineBar'
import { Avatar } from '@/components/ui/misc'
import { Badge } from '@/components/ui/Badge'

const nav = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/sanes', label: 'Sanes', icon: Coins },
  { to: '/participantes', label: 'Participantes', icon: Users },
  { to: '/pagos', label: 'Pagos', icon: Wallet },
  { to: '/morosos', label: 'Morosos', icon: AlertTriangle },
  { to: '/entregas', label: 'Entregas', icon: PackageCheck },
  { to: '/reportes', label: 'Reportes', icon: BarChart3 },
  { to: '/configuracion', label: 'Configuración', icon: Settings },
]

const bottomNav = [nav[0], nav[1], nav[3], nav[4]]

export function Layout() {
  const { tenant, profile, plan, subscription, signOut } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex h-16 items-center px-5">
          <Wordmark />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {nav.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <PlanPill plan={plan.name} status={subscription?.status} />
        </div>
      </aside>

      {/* Drawer móvil */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white shadow-xl animate-slide-up">
            <div className="flex h-16 items-center justify-between px-5">
              <Wordmark />
              <button onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
              {nav.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setDrawerOpen(false)} />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Contenido */}
      <div className="lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur">
          <button
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">
              {tenant?.name ?? 'MisanRD'}
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-slate-100"
            >
              <Avatar name={profile?.full_name ?? tenant?.name} size="sm" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-card-hover animate-fade-in">
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {profile?.full_name ?? 'Administradora'}
                    </p>
                    <p className="truncate text-xs text-slate-500">{tenant?.name}</p>
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      navigate('/configuracion')
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    <Settings className="h-4 w-4" /> Configuración
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        <OfflineBar />

        <main className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {bottomNav.map((item) => (
          <BottomItem key={item.to} {...item} />
        ))}
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2 text-slate-500"
        >
          <MoreHorizontal className="h-5 w-5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </nav>
    </div>
  )
}

function NavItem({
  to,
  label,
  icon: Icon,
  end,
  onClick,
}: {
  to: string
  label: string
  icon: typeof Coins
  end?: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-brand-50 text-brand-700'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        )
      }
    >
      <Icon className="h-5 w-5" />
      {label}
    </NavLink>
  )
}

function BottomItem({
  to,
  label,
  icon: Icon,
  end,
}: {
  to: string
  label: string
  icon: typeof Coins
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-0.5 py-2',
          isActive ? 'text-brand-600' : 'text-slate-500',
        )
      }
    >
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  )
}

function PlanPill({ plan, status }: { plan: string; status?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs text-slate-500">Plan</p>
        <p className="truncate text-sm font-semibold text-slate-800">{plan}</p>
      </div>
      {status === 'trial' && <Badge tone="gold">Prueba</Badge>}
      {status === 'active' && <Badge tone="green">Activo</Badge>}
    </div>
  )
}
