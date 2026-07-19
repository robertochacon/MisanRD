import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Coins,
  Users,
  CalendarClock,
  Wallet,
  Check,
  Minus,
  PackageCheck,
  Ban,
  Trophy,
} from 'lucide-react'
import { useSan, useCancelSan } from '@/hooks/sanes'
import type { InstallmentRow } from '@/hooks/payments'
import { PaymentModal } from '@/features/payments/PaymentModal'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatCard } from '@/components/ui/StatCard'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { SanStatusBadge, PayoutStatusBadge } from '@/components/StatusBadges'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/toast'
import { money, fmtDate } from '@/lib/format'
import { FREQUENCY_LABEL } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { Installment } from '@/types/db'

type Tab = 'resumen' | 'cronograma' | 'historial'

export function SanDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data, isLoading } = useSan(id)
  const cancelSan = useCancelSan()
  const [tab, setTab] = useState<Tab>('resumen')
  const [payFor, setPayFor] = useState<InstallmentRow | null>(null)

  const stats = useMemo(() => {
    if (!data) return null
    const collected = data.installments.reduce((a, i) => a + Number(i.paid_amount), 0)
    const total = data.installments.reduce((a, i) => a + Number(i.amount), 0)
    const delivered = data.payouts.filter((p) => p.status === 'delivered').length
    return {
      collected,
      total,
      pending: total - collected,
      delivered,
      totalPeriods: data.payouts.length,
    }
  }, [data])

  if (isLoading || !data || !stats) return <PageLoader />

  const { san, members, payouts, installments, participants } = data

  const doCancel = async () => {
    if (!window.confirm('¿Seguro que deseas cancelar este San? Esta acción no se puede deshacer.'))
      return
    try {
      await cancelSan.mutateAsync(san.id)
      toast.success('San cancelado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error')
    }
  }

  return (
    <div>
      <button
        onClick={() => navigate('/sanes')}
        className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a Sanes
      </button>

      <PageHeader
        title={san.name}
        description={`${money(san.contribution_amount)} · ${FREQUENCY_LABEL[san.frequency]} · inicia ${fmtDate(san.start_date)}`}
        action={
          <div className="flex items-center gap-2">
            <SanStatusBadge status={san.status} />
            {(san.status === 'active' || san.status === 'draft') && (
              <Button variant="ghost" size="sm" onClick={doCancel}>
                <Ban className="h-4 w-4" /> Cancelar
              </Button>
            )}
          </div>
        }
      />

      {san.description && <p className="-mt-2 mb-4 text-sm text-slate-500">{san.description}</p>}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Recaudado" value={money(stats.collected)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label="Por cobrar" value={money(stats.pending)} icon={<Coins className="h-5 w-5" />} tone="amber" />
        <StatCard label="Participantes" value={members.length} icon={<Users className="h-5 w-5" />} tone="blue" />
        <StatCard
          label="Entregas"
          value={`${stats.delivered}/${stats.totalPeriods}`}
          icon={<PackageCheck className="h-5 w-5" />}
          tone="gold"
        />
      </div>

      {san.status === 'completed' && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <Trophy className="h-5 w-5" /> ¡Este San se completó! Todas las entregas fueron realizadas.
        </div>
      )}

      {/* Tabs */}
      <div className="mt-5 flex gap-1 border-b border-slate-200">
        {(['resumen', 'cronograma', 'historial'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t}
            {tab === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'resumen' && <ResumenTab members={members} participants={participants} payouts={payouts} />}
        {tab === 'cronograma' && <CronogramaTab payouts={payouts} />}
        {tab === 'historial' && (
          <HistorialTab
            members={members}
            payouts={payouts}
            installments={installments}
            sanName={san.name}
            onPay={(inst, participant) => setPayFor({ ...inst, participant })}
          />
        )}
      </div>

      <PaymentModal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        installment={payFor}
        sanName={san.name}
      />
    </div>
  )
}

function ResumenTab({
  members,
  participants,
  payouts,
}: {
  members: import('@/hooks/sanes').SanMember[]
  participants: Record<string, import('@/types/db').Participant>
  payouts: import('@/hooks/sanes').PayoutRow[]
}) {
  const payoutByRecipient = useMemo(() => {
    const m: Record<string, number> = {}
    payouts.forEach((p) => (m[p.recipient_participant_id] = p.period_number))
    return m
  }, [payouts])

  return (
    <Card>
      <CardHeader title="Participantes y sus turnos" />
      <CardBody className="p-0">
        <ul className="divide-y divide-slate-100">
          {members.map((m) => (
            <li key={m.id} className="flex items-center gap-3 px-5 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                {m.position}
              </span>
              <Avatar name={participants[m.participant_id]?.full_name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {participants[m.participant_id]?.full_name}
                </p>
                <p className="text-xs text-slate-500">
                  {participants[m.participant_id]?.phone ?? 'Sin teléfono'}
                </p>
              </div>
              <Badge tone="blue">Turno #{payoutByRecipient[m.participant_id] ?? m.position}</Badge>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  )
}

function CronogramaTab({ payouts }: { payouts: import('@/hooks/sanes').PayoutRow[] }) {
  if (payouts.length === 0) {
    return <EmptyState icon={<CalendarClock className="h-5 w-5" />} title="Sin cronograma" />
  }
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Turno</th>
              <th className="px-4 py-2.5">Fecha</th>
              <th className="px-4 py-2.5">Recibe</th>
              <th className="px-4 py-2.5 text-right">Monto</th>
              <th className="px-4 py-2.5 text-right">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payouts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50">
                <td className="px-4 py-2.5 font-medium text-slate-500">#{p.period_number}</td>
                <td className="px-4 py-2.5 text-slate-600">{fmtDate(p.scheduled_date)}</td>
                <td className="px-4 py-2.5 font-medium text-slate-800">{p.recipient?.full_name}</td>
                <td className="px-4 py-2.5 text-right font-semibold text-brand-600">
                  {money(p.expected_amount)}
                </td>
                <td className="px-4 py-2.5 text-right">
                  <PayoutStatusBadge status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-4 py-3">
        <Link to="/entregas">
          <Button variant="secondary" size="sm">
            <PackageCheck className="h-4 w-4" /> Ir a Entregas
          </Button>
        </Link>
      </div>
    </Card>
  )
}

function HistorialTab({
  members,
  payouts,
  installments,
  onPay,
}: {
  members: import('@/hooks/sanes').SanMember[]
  payouts: import('@/hooks/sanes').PayoutRow[]
  installments: Installment[]
  sanName: string
  onPay: (inst: Installment, participant: import('@/types/db').Participant) => void
}) {
  const periods = payouts.length
  const today = new Date()

  // lookup por participante + período
  const lookup = useMemo(() => {
    const m = new Map<string, Installment>()
    installments.forEach((i) => m.set(`${i.participant_id}:${i.period_number}`, i))
    return m
  }, [installments])

  if (periods === 0) {
    return <EmptyState icon={<Wallet className="h-5 w-5" />} title="Sin cuotas" />
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-2.5 text-left">Participante</th>
              {Array.from({ length: periods }, (_, i) => (
                <th key={i} className="px-2 py-2.5 text-center">
                  #{i + 1}
                </th>
              ))}
              <th className="px-4 py-2.5 text-right">Pagado</th>
              <th className="px-4 py-2.5 text-right">Debe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => {
              const p = m.participant
              let paid = 0
              let total = 0
              return (
                <tr key={m.id} className="hover:bg-slate-50/40">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 text-left">
                    <div className="flex items-center gap-2">
                      <Avatar name={p?.full_name} size="sm" />
                      <span className="max-w-[120px] truncate text-sm font-medium text-slate-800">
                        {p?.full_name}
                      </span>
                    </div>
                  </td>
                  {Array.from({ length: periods }, (_, i) => {
                    const inst = lookup.get(`${m.participant_id}:${i + 1}`)
                    if (inst) {
                      paid += Number(inst.paid_amount)
                      total += Number(inst.amount)
                    }
                    const overdue = inst && inst.status !== 'paid' && new Date(inst.due_date) < today
                    return (
                      <td key={i} className="px-2 py-2 text-center">
                        {!inst ? (
                          <Minus className="mx-auto h-4 w-4 text-slate-200" />
                        ) : inst.status === 'paid' ? (
                          <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <button
                            onClick={() => p && onPay(inst, p)}
                            className={cn(
                              'mx-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors',
                              inst.status === 'partial'
                                ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                : overdue
                                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                                  : 'bg-slate-100 text-slate-400 hover:bg-brand-100 hover:text-brand-600',
                            )}
                            title="Registrar pago"
                          >
                            {inst.status === 'partial' ? '½' : '+'}
                          </button>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-4 py-2 text-right font-medium text-emerald-600">{money(paid)}</td>
                  <td className="px-4 py-2 text-right font-medium text-red-500">
                    {money(total - paid)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400">
        Toca <span className="font-semibold text-brand-600">+</span> para registrar un pago pendiente ·{' '}
        <Check className="inline h-3 w-3 text-emerald-500" /> pagada · ½ parcial
      </p>
    </Card>
  )
}
