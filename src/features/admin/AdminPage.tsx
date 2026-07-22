import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Users,
  Coins,
  Wallet,
  ShieldCheck,
  ShieldPlus,
  UserRound,
  LogOut,
  Search,
  RefreshCw,
  SlidersHorizontal,
  Eye,
  Ban,
  Play,
  Trash2,
  UserCog,
  ArrowRight,
  Sparkles,
  Check,
} from 'lucide-react'
import { useAuth } from '@/auth/AuthProvider'
import { Wordmark } from '@/components/Logo'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { money, fmtDate } from '@/lib/format'
import { errorMessage } from '@/lib/errors'
import { PLANS, PLAN_ORDER, planPriceLabel } from '@/lib/constants'
import {
  useAdminOverview,
  useAdminTenants,
  useAdminSetSubscription,
  useAdminSetTenantSuspended,
  useAdminMembers,
  useAdminSetMemberRole,
  useAdminRemoveMember,
  useAdminSetUserBanned,
  useAdminPlatformAdmins,
  useAdminGrantPlatformAdmin,
  useAdminRevokePlatformAdmin,
  useAdminPlanRequests,
  useAdminResolvePlanRequest,
} from '@/hooks/admin'
import type {
  AdminPlanRequestRow,
  AdminTenantRow,
  MemberRole,
  PlanCode,
  SubscriptionStatus,
} from '@/types/db'

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
  const planRequests = useAdminPlanRequests()
  const resolveRequest = useAdminResolvePlanRequest()
  const setSuspended = useAdminSetTenantSuspended()
  const toast = useToast()
  const [query, setQuery] = useState('')
  const [planFor, setPlanFor] = useState<AdminTenantRow | null>(null)
  const [membersFor, setMembersFor] = useState<AdminTenantRow | null>(null)

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

  const toggleSuspend = async (t: AdminTenantRow) => {
    const next = !t.suspended
    if (!window.confirm(next ? `¿Suspender "${t.name}"? No podrán registrar pagos ni operar.` : `¿Reactivar "${t.name}"?`))
      return
    try {
      await setSuspended.mutateAsync({ tenant: t.id, suspended: next })
      toast.success(next ? 'Negocio suspendido.' : 'Negocio reactivado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cambiar el estado.')
    }
  }

  const resolvePlan = async (r: AdminPlanRequestRow, approve: boolean) => {
    const target = PLANS[r.requested_plan].name
    if (
      !window.confirm(
        approve
          ? `¿Aprobar y cambiar "${r.tenant_name}" al plan ${target}?`
          : `¿Rechazar la solicitud de ${target} de "${r.tenant_name}"?`,
      )
    )
      return
    try {
      await resolveRequest.mutateAsync({ id: r.id, approve })
      toast.success(approve ? `Plan cambiado a ${target}.` : 'Solicitud rechazada.')
    } catch (err) {
      toast.error(errorMessage(err))
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Wordmark />
          <Badge tone="purple" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Super-admin
          </Badge>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden max-w-[180px] truncate text-sm text-slate-500 sm:block">{user?.email}</span>
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
              planRequests.refetch()
            }}
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Negocios" value={ov?.tenants ?? '—'} icon={<Building2 className="h-5 w-5" />} tone="blue" />
          <StatCard label="Usuarios" value={ov?.members ?? '—'} icon={<UserRound className="h-5 w-5" />} tone="slate" />
          <StatCard label="Participantes" value={ov?.participants ?? '—'} icon={<Users className="h-5 w-5" />} tone="slate" />
          <StatCard label="Sanes activos" value={ov?.active_sanes ?? '—'} icon={<Coins className="h-5 w-5" />} tone="green" />
          <StatCard label="Recaudado" value={ov ? money(ov.collected_total) : '—'} icon={<Wallet className="h-5 w-5" />} tone="gold" />
          <StatCard label="Super-admins" value={ov?.platform_admins ?? '—'} icon={<ShieldCheck className="h-5 w-5" />} tone="slate" />
        </div>

        {ov && (
          <div className="mt-4 flex flex-wrap gap-2">
            {PLAN_ORDER.map((p) => (
              <Badge key={p} tone={planTone(p)}>
                {PLANS[p].name}: {ov.by_plan?.[p] ?? 0}
              </Badge>
            ))}
          </div>
        )}

        {planRequests.data && planRequests.data.length > 0 && (
          <Card className="mt-6 border-gold-300">
            <CardHeader
              title={`Solicitudes de plan (${planRequests.data.length})`}
              subtitle="Cuentas que pidieron cambiar de plan"
              action={
                <Badge tone="gold" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" /> Pendientes
                </Badge>
              }
            />
            <CardBody className="space-y-2">
              {planRequests.data.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">{r.tenant_name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {r.owner_name ?? '—'} · {r.owner_email ?? '—'}
                      {r.whatsapp ? ` · ${r.whatsapp}` : ''}
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Badge tone={planTone(r.current_plan)}>
                        {r.current_plan ? PLANS[r.current_plan].name : '—'}
                      </Badge>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                      <Badge tone={planTone(r.requested_plan)}>{PLANS[r.requested_plan].name}</Badge>
                      <span className="text-xs text-slate-400">· {fmtDate(r.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      loading={resolveRequest.isPending}
                      onClick={() => resolvePlan(r, false)}
                    >
                      Rechazar
                    </Button>
                    <Button size="sm" loading={resolveRequest.isPending} onClick={() => resolvePlan(r, true)}>
                      <Check className="h-4 w-4" /> Aprobar
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

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
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Negocio</th>
                    <th className="px-4 py-3 font-medium">Dueña</th>
                    <th className="px-4 py-3 font-medium">Plan</th>
                    <th className="px-4 py-3 font-medium">Estado</th>
                    <th className="px-4 py-3 text-right font-medium">Usuarios</th>
                    <th className="px-4 py-3 text-right font-medium">Particip.</th>
                    <th className="px-4 py-3 text-right font-medium">Recaudado</th>
                    <th className="px-4 py-3 font-medium">Alta</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((t) => (
                    <tr key={t.id} className={t.suspended ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-800">{t.name}</p>
                          {t.suspended && <Badge tone="red">Suspendido</Badge>}
                        </div>
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
                        <Badge tone={statusTone(t.sub_status)}>{t.sub_status ? STATUS_LABEL[t.sub_status] : '—'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{t.members}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-600">{t.participants}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-800">{money(t.collected_total)}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">{fmtDate(t.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn title="Ver detalle" onClick={() => navigate(`/admin/negocio/${t.id}`)}>
                            <Eye className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn title="Usuarios" onClick={() => setMembersFor(t)}>
                            <Users className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn title="Plan y suscripción" onClick={() => setPlanFor(t)}>
                            <SlidersHorizontal className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            title={t.suspended ? 'Reactivar negocio' : 'Suspender negocio'}
                            onClick={() => toggleSuspend(t)}
                            tone={t.suspended ? 'green' : 'red'}
                          >
                            {t.suspended ? <Play className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="mt-6">
          <SuperAdminsCard />
        </div>
      </main>

      <ChangePlanModal tenant={planFor} onClose={() => setPlanFor(null)} />
      <MembersModal tenant={membersFor} onClose={() => setMembersFor(null)} />
    </div>
  )
}

function IconBtn({
  title,
  onClick,
  tone = 'slate',
  children,
}: {
  title: string
  onClick: () => void
  tone?: 'slate' | 'red' | 'green'
  children: React.ReactNode
}) {
  const toneCls =
    tone === 'red'
      ? 'text-red-500 hover:bg-red-50'
      : tone === 'green'
        ? 'text-emerald-600 hover:bg-emerald-50'
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
  return (
    <button title={title} aria-label={title} onClick={onClick} className={`rounded-lg p-2 ${toneCls}`}>
      {children}
    </button>
  )
}

function ChangePlanModal({ tenant, onClose }: { tenant: AdminTenantRow | null; onClose: () => void }) {
  const toast = useToast()
  const setSub = useAdminSetSubscription()
  const [plan, setPlan] = useState<PlanCode>('basic')
  const [status, setStatus] = useState<SubscriptionStatus>('active')

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
                {PLANS[p].name} — {planPriceLabel(PLANS[p])}
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
      </div>
    </Modal>
  )
}

function MembersModal({ tenant, onClose }: { tenant: AdminTenantRow | null; onClose: () => void }) {
  const toast = useToast()
  const members = useAdminMembers(tenant?.id)
  const setRole = useAdminSetMemberRole()
  const removeMember = useAdminRemoveMember()
  const setBanned = useAdminSetUserBanned()

  const wrap = (p: Promise<unknown>, ok: string) =>
    p.then(() => toast.success(ok)).catch((e) => toast.error(e instanceof Error ? e.message : 'Error'))

  return (
    <Modal open={Boolean(tenant)} onClose={onClose} title={tenant ? `Usuarios · ${tenant.name}` : 'Usuarios'} size="lg">
      {members.isLoading ? (
        <PageLoader label="Cargando usuarios…" />
      ) : (members.data ?? []).length === 0 ? (
        <EmptyState icon={<Users className="h-5 w-5" />} title="Sin usuarios" description="Este negocio no tiene administradores." />
      ) : (
        <ul className="space-y-2">
          {(members.data ?? []).map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
              <Avatar name={m.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{m.full_name ?? 'Administrador'}</p>
                <p className="truncate text-xs text-slate-400">{m.email}</p>
              </div>
              {m.banned && <Badge tone="red">Login suspendido</Badge>}
              <Select
                value={m.role}
                onChange={(e) =>
                  wrap(setRole.mutateAsync({ user: m.id, role: e.target.value as MemberRole }), 'Rol actualizado')
                }
                className="h-9 w-36"
              >
                <option value="owner">Dueña</option>
                <option value="admin">Administrador</option>
              </Select>
              <IconBtn
                title={m.banned ? 'Reactivar login' : 'Suspender login'}
                tone={m.banned ? 'green' : 'red'}
                onClick={() => wrap(setBanned.mutateAsync({ user: m.id, banned: !m.banned }), m.banned ? 'Login reactivado' : 'Login suspendido')}
              >
                {m.banned ? <Play className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
              </IconBtn>
              <IconBtn
                title="Quitar del negocio"
                tone="red"
                onClick={() => {
                  if (window.confirm(`¿Quitar a ${m.full_name ?? m.email} de ${tenant?.name}? Su cuenta de login no se elimina.`))
                    wrap(removeMember.mutateAsync(m.id), 'Usuario quitado del negocio')
                }}
              >
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
        <UserCog className="h-3.5 w-3.5" /> "Suspender login" bloquea el acceso de esa persona; "quitar" la desvincula del negocio.
      </p>
    </Modal>
  )
}

function SuperAdminsCard() {
  const toast = useToast()
  const admins = useAdminPlatformAdmins()
  const grant = useAdminGrantPlatformAdmin()
  const revoke = useAdminRevokePlatformAdmin()
  const { user } = useAuth()
  const [email, setEmail] = useState('')

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await grant.mutateAsync(email.trim())
      toast.success('Super-admin agregado.')
      setEmail('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo agregar.')
    }
  }

  return (
    <Card>
      <CardHeader title="Super-admins de plataforma" subtitle="Cuentas con acceso a este panel (sin negocio propio)" />
      <CardBody className="space-y-4">
        <ul className="space-y-2">
          {(admins.data ?? []).map((a) => (
            <li key={a.user_id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <Avatar name={a.email} size="sm" />
              <span className="flex-1 truncate text-sm font-medium text-slate-800">{a.email ?? a.user_id}</span>
              {a.user_id === user?.id && <Badge tone="blue">Tú</Badge>}
              <IconBtn
                title="Quitar super-admin"
                tone="red"
                onClick={() => {
                  if (window.confirm(`¿Quitar a ${a.email} como super-admin?`))
                    revoke
                      .mutateAsync(a.user_id)
                      .then(() => toast.success('Super-admin removido.'))
                      .catch((err) => toast.error(err instanceof Error ? err.message : 'Error'))
                }}
              >
                <Trash2 className="h-4 w-4" />
              </IconBtn>
            </li>
          ))}
        </ul>

        <form onSubmit={add} className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com (cuenta existente, sin negocio)"
            className="min-w-[220px] flex-1"
          />
          <Button type="submit" loading={grant.isPending}>
            <ShieldPlus className="h-4 w-4" /> Agregar
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}
