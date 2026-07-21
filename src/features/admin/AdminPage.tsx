import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  Coins,
  Wallet,
  ShieldCheck,
  UserRound,
  LogOut,
  Search,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Wordmark } from '@/components/Logo'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { PageLoader, EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { money, fmtDate } from '@/lib/format'
import { PLANS, PLAN_ORDER } from '@/lib/constants'
import { useAdminOverview, useAdminTenants, useAdminSetSubscription } from '@/hooks/admin'
import type { AdminTenantRow, PlanCode, SubscriptionStatus } from '@/types/db'

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  trial: 'Prueba',
  active: 'Activo',
  past_due: 'Vencido',
  canceled: 'Cancelado',
}

const SUB_STATUSES: SubscriptionStatus[] = ['trial', 'active', 'past_due', 'canceled']

function planTone(plan: PlanCode | null) {
  return plan === 'premium' ? 'gold' : plan === 'entrepreneur' ? 'blue' : 'gray'
}

function statusTone(status: SubscriptionStatus | null) {
  if (status === 'active') return 'green'
  if (status === 'trial') return 'gold'
  if (status === 'past_due') return 'amber'
  if (status === 'canceled') return 'red'
  return 'gray'
}

export function AdminPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const overview = useAdminOverview()
  const tenants = useAdminTenants()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<AdminTenantRow | null>(null)

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const rows = useMemo(() => {
    const list = tenants.data ?? []
    const q = query.trim().toLowerCase()
    if (!q) return list
    return list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.owner_name ?? '').toLowerCase().includes(q) ||
        (t.owner_email ?? '').toLowerCase().includes(q),
    )
  }, [tenants.data, query])

  const ov = overview.data

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      {/* Encabezado */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Wordmark />
          <Badge tone="purple" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Super-admin
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-sm text-slate-500 sm:block">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Panel de plataforma</h1>
            <p className="text-sm text-slate-500">Todos los negocios registrados en MisanRD.</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              overview.refetch()
              tenants.refetch()
            }}
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        </div>

        {/* Métricas globales */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Negocios" value={ov?.tenants ?? '—'} icon={<Building2 className="h-5 w-5" />} tone="blue" />
          <StatCard label="Usuarios" value={ov?.members ?? '—'} icon={<UserRound className="h-5 w-5" />} tone="slate" />
          <StatCard label="Participantes" value={ov?.participants ?? '—'} icon={<Users className="h-5 w-5" />} tone="slate" />
          <StatCard label="Sanes activos" value={ov?.active_sanes ?? '—'} icon={<Coins className="h-5 w-5" />} tone="green" />
          <StatCard
            label="Recaudado"
            value={ov ? money(ov.collected_total) : '—'}
            icon={<Wallet className="h-5 w-5" />}
            tone="gold"
          />
          <StatCard
            label="Super-admins"
            value={ov?.platform_admins ?? '—'}
            icon={<ShieldCheck className="h-5 w-5" />}
            tone="slate"
          />
        </div>

        {/* Distribución por plan */}
        {ov && (
          <div className="mt-4 flex flex-wrap gap-2">
            {PLAN_ORDER.map((p) => (
              <Badge key={p} tone={planTone(p)}>
                {PLANS[p].name}: {ov.by_plan?.[p] ?? 0}
              </Badge>
            ))}
          </div>
        )}

        {/* Buscador */}
        <div className="mt-6">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por negocio, dueña o correo…"
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabla de negocios */}
        <Card className="mt-4 overflow-hidden">
          {tenants.isLoading ? (
            <PageLoader label="Cargando negocios…" />
          ) : tenants.isError ? (
            <div className="p-6 text-center text-sm text-red-600">
              {tenants.error instanceof Error ? tenants.error.message : 'No se pudieron cargar los negocios.'}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" />}
              title={query ? 'Sin resultados' : 'Aún no hay negocios'}
              description={query ? 'Prueba con otro término de búsqueda.' : 'Cuando alguien cree su cuenta, aparecerá aquí.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Negocio</th>
                    <th className="px-4 py-3 font-medium">Dueña</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Miembros</th>
                    <th className="px-4 py-3 text-right font-medium">Particip.</th>
                    <th className="px-4 py-3 text-right font-medium">Sanes</th>
                    <th className="px-4 py-3 text-right font-medium">Recaudado</th>
                    <th className="px-4 py-3 font-medium">Alta</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">{t.name}</p>
                        {t.whatsapp && <p className="text-xs text-slate-400">{t.whatsapp}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{t.owner_name ?? '—'}</p>
                        {t.owner_email && <p className="text-xs text-slate-400">{t.owner_email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={planTone(t.plan)}>{t.plan ? PLANS[t.plan].name : '—'}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone(t.sub_status)}>
                          {t.sub_status ? STATUS_LABEL[t.sub_status] : '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{t.members}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{t.participants}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                        {t.active_sanes}
                        <span className="text-slate-400">/{t.total_sanes}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">
                        {money(t.collected_total)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmtDate(t.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(t)}>
                          <SlidersHorizontal className="h-4 w-4" /> Plan
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </main>

      <ChangePlanModal tenant={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function ChangePlanModal({ tenant, onClose }: { tenant: AdminTenantRow | null; onClose: () => void }) {
  const toast = useToast()
  const setSub = useAdminSetSubscription()
  const [plan, setPlan] = useState<PlanCode>('basic')
  const [status, setStatus] = useState<SubscriptionStatus>('active')

  // Sincroniza el formulario con el negocio seleccionado al abrir.
  const key = tenant?.id ?? ''
  const [syncedKey, setSyncedKey] = useState('')
  if (tenant && key !== syncedKey) {
    setSyncedKey(key)
    setPlan(tenant.plan ?? 'basic')
    setStatus(tenant.sub_status ?? 'active')
  }

  const save = async () => {
    if (!tenant) return
    try {
      await setSub.mutateAsync({ tenant: tenant.id, plan, status })
      toast.success(`Plan de "${tenant.name}" actualizado.`)
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar el plan.')
    }
  }

  return (
    <Modal
      open={Boolean(tenant)}
      onClose={onClose}
      title={tenant ? `Suscripción · ${tenant.name}` : 'Suscripción'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} loading={setSub.isPending}>
            Guardar
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Plan</label>
          <Select value={plan} onChange={(e) => setPlan(e.target.value as PlanCode)}>
            {PLAN_ORDER.map((p) => (
              <option key={p} value={p}>
                {PLANS[p].name} — RD${PLANS[p].price}/mes
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Estado</label>
          <Select value={status} onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}>
            {SUB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-slate-400">
          El cambio es inmediato y aplica los límites del plan en el negocio seleccionado.
        </p>
      </div>
    </Modal>
  )
}
