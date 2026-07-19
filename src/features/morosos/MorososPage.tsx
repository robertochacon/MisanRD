import { AlertTriangle, MessageCircle, CheckCircle2, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useMorosos, type Moroso } from '@/hooks/morosos'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { money, fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { openWhatsApp, paymentReminderMessage } from '@/lib/whatsapp'
import { useAuth } from '@/auth/AuthProvider'

export function MorososPage() {
  const { data, isLoading } = useMorosos()
  const { tenant } = useAuth()

  if (isLoading) return <PageLoader />

  const totalDebt = (data ?? []).reduce((a, m) => a + m.overdueAmount, 0)

  return (
    <div>
      <PageHeader
        title="Morosos"
        description={`${data?.length ?? 0} participantes con cuotas vencidas · ${money(totalDebt)} en total`}
      />

      {!data || data.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="h-5 w-5" />}
          title="¡Nadie está atrasado! 🎉"
          description="No hay cuotas vencidas en este momento."
        />
      ) : (
        <div className="space-y-3">
          {data.map((m) => (
            <MorosoCard key={m.participant.id} moroso={m} businessName={tenant?.name} />
          ))}
        </div>
      )}
    </div>
  )
}

function severityTone(count: number): { tone: 'amber' | 'red'; bar: string } {
  if (count >= 3) return { tone: 'red', bar: 'bg-red-500' }
  if (count === 2) return { tone: 'red', bar: 'bg-red-400' }
  return { tone: 'amber', bar: 'bg-amber-400' }
}

function MorosoCard({ moroso, businessName }: { moroso: Moroso; businessName?: string | null }) {
  const [open, setOpen] = useState(false)
  const sev = severityTone(moroso.overdueCount)
  const firstItem = moroso.items[0]

  return (
    <Card className="overflow-hidden">
      <div className={cn('h-1', sev.bar)} />
      <div className="flex items-center gap-3 p-4">
        <Avatar name={moroso.participant.full_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{moroso.participant.full_name}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <Badge tone={sev.tone}>
              Debe {moroso.overdueCount} {moroso.overdueCount === 1 ? 'cuota' : 'cuotas'}
            </Badge>
            <span className="text-sm font-semibold text-red-600">{money(moroso.overdueAmount)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() =>
              openWhatsApp(
                moroso.participant.whatsapp ?? moroso.participant.phone,
                paymentReminderMessage({
                  participantName: moroso.participant.full_name,
                  sanName: firstItem?.san_name ?? '',
                  amount: moroso.overdueAmount,
                  dueDate: firstItem?.due_date,
                  businessName,
                }),
              )
            }
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
            aria-label="Recordar por WhatsApp"
            title="Recordar por WhatsApp"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            aria-label="Ver detalle"
          >
            <ChevronDown className={cn('h-5 w-5 transition-transform', open && 'rotate-180')} />
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2">
          <ul className="divide-y divide-slate-100">
            {moroso.items.map((it) => (
              <li key={it.installment_id} className="flex items-center justify-between py-2 text-sm">
                <span className="flex items-center gap-2 text-slate-600">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  {it.san_name} · Cuota #{it.period}
                </span>
                <span className="text-slate-500">
                  {fmtDate(it.due_date)} · <span className="font-medium text-red-600">{money(it.owed)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
