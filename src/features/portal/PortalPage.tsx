import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Wallet,
  Clock,
  CalendarCheck,
  Coins,
  Check,
  AlertTriangle,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import { portalFunctionUrl } from '@/lib/supabase'
import { money, fmtDate } from '@/lib/format'
import { Spinner } from '@/components/ui/misc'
import { cn } from '@/lib/cn'

interface PortalInstallment {
  period: number
  due_date: string
  amount: number
  paid_amount: number
  status: string
}
interface PortalSan {
  id: string
  name: string
  description: string | null
  contribution_amount: number
  frequency_label: string
  status: string
  my_position: number
  totals: { paid: number; total: number; pending: number }
  payout: { period: number; date: string; amount: number; status: string } | null
  installments: PortalInstallment[]
}
interface PortalData {
  tenant: { name: string; logo_url: string | null; whatsapp: string | null }
  participant: { full_name: string; status: string }
  summary: {
    total_paid: number
    total_due: number
    total_pending: number
    sanes_count: number
    next_due: { due_date: string; amount: number } | null
  }
  sanes: PortalSan[]
  receipts: { id: string; number: string | null; amount: number; paid_at: string; method: string }[]
}

export function PortalPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${portalFunctionUrl}?token=${encodeURIComponent(token ?? '')}`, {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        })
        const json = await res.json()
        if (!active) return
        if (!res.ok) {
          setError(json?.error ?? 'No pudimos cargar tu información')
        } else {
          setData(json as PortalData)
        }
      } catch {
        if (active) setError('Error de conexión')
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-slate-50 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="font-semibold text-slate-700">{error ?? 'Enlace inválido'}</p>
        <p className="text-sm text-slate-500">Pide a tu administradora un enlace actualizado.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-10">
      {/* Header */}
      <header className="bg-brand-950 px-5 pb-8 pt-6 text-white">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          {data.tenant.logo_url ? (
            <img src={data.tenant.logo_url} alt="" className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500">
              <Coins className="h-6 w-6" />
            </span>
          )}
          <div>
            <p className="text-sm text-brand-200">{data.tenant.name}</p>
            <p className="text-lg font-bold">{data.participant.full_name}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-5 max-w-lg space-y-4 px-4">
        {/* Resumen */}
        <div className="grid grid-cols-2 gap-3">
          <SummaryCard icon={<Wallet className="h-5 w-5" />} label="Has pagado" value={money(data.summary.total_paid)} tone="green" />
          <SummaryCard icon={<Clock className="h-5 w-5" />} label="Debes" value={money(data.summary.total_pending)} tone="amber" />
        </div>

        {data.summary.next_due && (
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <CalendarCheck className="h-6 w-6 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Tu próxima cuota</p>
              <p className="text-xs text-amber-600">Vence el {fmtDate(data.summary.next_due.due_date)}</p>
            </div>
            <p className="text-lg font-bold text-amber-700">{money(data.summary.next_due.amount)}</p>
          </div>
        )}

        {/* Sanes */}
        {data.sanes.map((san) => (
          <PortalSanCard key={san.id} san={san} />
        ))}

        {/* Recibos */}
        {data.receipts.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
              <Receipt className="h-5 w-5 text-brand-500" /> Mis recibos
            </h3>
            <ul className="divide-y divide-slate-100">
              {data.receipts.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">{r.number ?? 'Recibo'}</p>
                    <p className="text-xs text-slate-500">{fmtDate(r.paid_at)}</p>
                  </div>
                  <span className="font-semibold text-emerald-600">{money(r.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 pt-2 text-center text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Portal seguro · MisanRD
        </p>
      </div>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: string
  tone: 'green' | 'amber'
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <span
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          tone === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600',
        )}
      >
        {icon}
      </span>
      <p className="mt-2 text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function PortalSanCard({ san }: { san: PortalSan }) {
  const pct = san.totals.total > 0 ? Math.round((san.totals.paid / san.totals.total) * 100) : 0
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800">{san.name}</h3>
          <p className="text-xs text-slate-500">
            {money(san.contribution_amount)} · {san.frequency_label} · turno #{san.my_position}
          </p>
        </div>
        {san.payout && (
          <div className="text-right">
            <p className="text-xs text-slate-400">Recibes</p>
            <p className="text-sm font-bold text-brand-600">{money(san.payout.amount)}</p>
            <p className="text-xs text-slate-500">{fmtDate(san.payout.date)}</p>
          </div>
        )}
      </div>

      {/* Progreso */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>Pagado {money(san.totals.paid)}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Cuotas */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {san.installments.map((i) => {
          const overdue = i.status !== 'paid' && new Date(i.due_date) < new Date()
          return (
            <span
              key={i.period}
              title={`Cuota #${i.period} · vence ${fmtDate(i.due_date)}`}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold',
                i.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-600'
                  : i.status === 'partial'
                    ? 'bg-amber-100 text-amber-600'
                    : overdue
                      ? 'bg-red-100 text-red-600'
                      : 'bg-slate-100 text-slate-400',
              )}
            >
              {i.status === 'paid' ? <Check className="h-3.5 w-3.5" /> : i.period}
            </span>
          )
        })}
      </div>
    </div>
  )
}
