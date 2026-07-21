import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Coins, Users, Wallet, AlertTriangle, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import { Wordmark } from '@/components/Logo'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader, EmptyState } from '@/components/ui/misc'
import { money, fmtDate } from '@/lib/format'
import { FREQUENCY_LABEL, PAYMENT_METHOD_LABEL } from '@/lib/constants'
import { useAdminTenantSummary } from '@/hooks/admin'
import type { PaymentMethod, SanFrequency, SanStatus } from '@/types/db'

const SAN_STATUS: Record<SanStatus, { label: string; tone: 'gray' | 'green' | 'blue' | 'red' }> = {
  draft: { label: 'Borrador', tone: 'gray' },
  active: { label: 'Activo', tone: 'green' },
  completed: { label: 'Completado', tone: 'blue' },
  cancelled: { label: 'Cancelado', tone: 'red' },
}

export function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const summary = useAdminTenantSummary(id)

  const tenant = useQuery({
    queryKey: ['admin', 'tenant', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase.from('tenants').select('*').eq('id', id).maybeSingle()
      if (error) throw error
      return data
    },
  })

  const sanes = useQuery({
    queryKey: ['admin', 'tenant-sanes', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sanes')
        .select('id,name,status,contribution_amount,frequency,participant_count,start_date')
        .eq('tenant_id', id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const payments = useQuery({
    queryKey: ['admin', 'tenant-payments', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id,amount,paid_at,method,participants(full_name)')
        .eq('tenant_id', id)
        .order('paid_at', { ascending: false })
        .limit(12)
      if (error) throw error
      return data ?? []
    },
  })

  const s = summary.data

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Wordmark />
          <Badge tone="purple" className="gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> Super-admin
          </Badge>
          <span className="ml-auto hidden truncate text-sm text-slate-500 sm:block">{user?.email}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <button
          onClick={() => navigate('/admin')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al panel
        </button>

        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-xl font-bold text-slate-900">{tenant.data?.name ?? 'Negocio'}</h1>
          {tenant.data?.suspended_at && <Badge tone="red">Suspendido</Badge>}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Sanes activos" value={s?.active_sanes ?? '—'} icon={<Coins className="h-5 w-5" />} tone="green" />
          <StatCard label="Participantes" value={s?.total_participants ?? '—'} icon={<Users className="h-5 w-5" />} tone="blue" />
          <StatCard label="Recaudado" value={s ? money(s.collected_total) : '—'} icon={<Wallet className="h-5 w-5" />} tone="gold" />
          <StatCard
            label="Morosos"
            value={s?.morosos_count ?? '—'}
            icon={<AlertTriangle className="h-5 w-5" />}
            tone="red"
            hint={s ? `${money(s.pending_amount)} pendiente` : undefined}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Sanes" subtitle={`${sanes.data?.length ?? 0} en total`} />
            <CardBody className="p-0">
              {sanes.isLoading ? (
                <PageLoader label="Cargando…" />
              ) : (sanes.data ?? []).length === 0 ? (
                <EmptyState icon={<Coins className="h-5 w-5" />} title="Sin sanes" className="m-5" />
              ) : (
                <ul className="divide-y divide-slate-50">
                  {(sanes.data ?? []).map((sn) => (
                    <li key={sn.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{sn.name}</p>
                        <p className="text-xs text-slate-400">
                          {money(sn.contribution_amount)} · {FREQUENCY_LABEL[sn.frequency as SanFrequency]} ·{' '}
                          {sn.participant_count} particip. · desde {fmtDate(sn.start_date)}
                        </p>
                      </div>
                      <Badge tone={SAN_STATUS[sn.status as SanStatus]?.tone ?? 'gray'}>
                        {SAN_STATUS[sn.status as SanStatus]?.label ?? sn.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Pagos recientes" subtitle="Últimos 12" />
            <CardBody className="p-0">
              {payments.isLoading ? (
                <PageLoader label="Cargando…" />
              ) : (payments.data ?? []).length === 0 ? (
                <EmptyState icon={<Wallet className="h-5 w-5" />} title="Sin pagos" className="m-5" />
              ) : (
                <ul className="divide-y divide-slate-50">
                  {(payments.data ?? []).map((p: any) => (
                    <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {p.participants?.full_name ?? 'Participante'}
                        </p>
                        <p className="text-xs text-slate-400">
                          {fmtDate(p.paid_at)} · {PAYMENT_METHOD_LABEL[p.method as PaymentMethod] ?? p.method}
                        </p>
                      </div>
                      <span className="tabular-nums text-sm font-semibold text-slate-800">{money(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">Vista de solo lectura para soporte y auditoría.</p>
      </main>
    </div>
  )
}
