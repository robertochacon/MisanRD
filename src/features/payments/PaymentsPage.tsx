import { useEffect, useMemo, useState } from 'react'
import { Wallet, MessageCircle, CheckCircle2, Filter } from 'lucide-react'
import { useSanes } from '@/hooks/sanes'
import { useSanInstallments, type InstallmentRow } from '@/hooks/payments'
import { PaymentModal } from './PaymentModal'
import { ReceiptsList } from './ReceiptsList'
import { cn } from '@/lib/cn'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { InstallmentStatusBadge } from '@/components/StatusBadges'
import { money, fmtDate } from '@/lib/format'
import { openWhatsApp, paymentReminderMessage } from '@/lib/whatsapp'
import { useAuth } from '@/auth/AuthProvider'

export function PaymentsPage() {
  const { tenant } = useAuth()
  const { data: sanes, isLoading: loadingSanes } = useSanes()
  const [sanId, setSanId] = useState<string>('')
  const [onlyPending, setOnlyPending] = useState(true)
  const [selected, setSelected] = useState<InstallmentRow | null>(null)
  const [tab, setTab] = useState<'cobrar' | 'recibos'>('cobrar')

  const activeSanes = useMemo(
    () => (sanes ?? []).filter((s) => s.status === 'active'),
    [sanes],
  )

  useEffect(() => {
    if (!sanId && activeSanes.length > 0) setSanId(activeSanes[0].id)
  }, [activeSanes, sanId])

  const { data: installments, isLoading } = useSanInstallments(sanId || undefined, onlyPending)
  const currentSan = sanes?.find((s) => s.id === sanId)

  if (loadingSanes) return <PageLoader />

  return (
    <div>
      <PageHeader title="Pagos" description="Registra las cuotas de tus participantes" />

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {(['cobrar', 'recibos'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'relative px-4 py-2.5 text-sm font-medium capitalize transition-colors',
              tab === t ? 'text-brand-600' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t === 'cobrar' ? 'Cobrar' : 'Recibos'}
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      {tab === 'recibos' ? (
        <ReceiptsList />
      ) : activeSanes.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-5 w-5" />}
          title="No tienes Sanes activos"
          description="Crea y activa un San para empezar a registrar pagos."
        />
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select
              value={sanId}
              onChange={(e) => setSanId(e.target.value)}
              className="sm:max-w-xs"
            >
              {activeSanes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Button
              variant={onlyPending ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setOnlyPending((v) => !v)}
            >
              <Filter className="h-4 w-4" />
              {onlyPending ? 'Solo pendientes' : 'Todas las cuotas'}
            </Button>
          </div>

          {isLoading ? (
            <PageLoader />
          ) : !installments || installments.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-5 w-5" />}
              title={onlyPending ? '¡Todo al día!' : 'Sin cuotas'}
              description={
                onlyPending
                  ? 'No hay cuotas pendientes en este San.'
                  : 'Este San no tiene cuotas registradas.'
              }
            />
          ) : (
            <Card className="divide-y divide-slate-100">
              {installments.map((i) => {
                const owed = Number(i.amount) - Number(i.paid_amount)
                const overdue = i.status !== 'paid' && new Date(i.due_date) < new Date()
                return (
                  <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={i.participant?.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {i.participant?.full_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        Cuota #{i.period_number} · vence {fmtDate(i.due_date)}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <InstallmentStatusBadge status={i.status} overdue={overdue} />
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">
                        {i.status === 'paid' ? money(i.amount) : money(owed)}
                      </p>
                      {i.status === 'partial' && (
                        <p className="text-xs text-amber-600">de {money(i.amount)}</p>
                      )}
                    </div>
                    {i.status !== 'paid' ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            openWhatsApp(
                              i.participant?.whatsapp ?? i.participant?.phone,
                              paymentReminderMessage({
                                participantName: i.participant?.full_name ?? '',
                                sanName: currentSan?.name ?? '',
                                amount: owed,
                                dueDate: i.due_date,
                                businessName: tenant?.name,
                              }),
                            )
                          }
                          className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                          aria-label="Recordar por WhatsApp"
                          title="Recordar por WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <Button size="sm" onClick={() => setSelected(i)}>
                          Pagar
                        </Button>
                      </div>
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    )}
                  </div>
                )
              })}
            </Card>
          )}
        </>
      )}

      <PaymentModal
        open={!!selected}
        onClose={() => setSelected(null)}
        installment={selected}
        sanName={currentSan?.name}
      />
    </div>
  )
}
