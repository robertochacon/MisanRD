import { useState } from 'react'
import { FileText, Download, MessageCircle, Trash2, Receipt as ReceiptIcon } from 'lucide-react'
import {
  useRecentPayments,
  useDeletePayment,
  receiptOf,
  type PaymentRow,
} from '@/hooks/payments'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { money, fmtDate } from '@/lib/format'
import { downloadReceipt } from '@/features/receipts/receiptActions'
import { openWhatsApp, receiptMessage } from '@/lib/whatsapp'
import { useAuth } from '@/auth/AuthProvider'

export function ReceiptsList() {
  const { data, isLoading } = useRecentPayments(100)
  const del = useDeletePayment()
  const { tenant } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState<string | null>(null)

  if (isLoading) return <PageLoader />
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon={<ReceiptIcon className="h-5 w-5" />}
        title="Aún no hay recibos"
        description="Cada pago que registres genera un recibo automáticamente."
      />
    )
  }

  const handleDownload = async (p: PaymentRow) => {
    const rec = receiptOf(p.receipts)
    if (!rec) return
    setBusy(p.id)
    try {
      await downloadReceipt({
        businessName: tenant?.name ?? 'MisanRD',
        receiptNumber: rec.number,
        participantName: p.participant?.full_name ?? '',
        sanName: p.san?.name ?? '',
        amount: Number(p.amount),
        date: p.paid_at,
        method: p.method,
        qrPayload: rec.qr_payload,
      })
    } catch {
      toast.error('No se pudo generar el PDF')
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (p: PaymentRow) => {
    if (!window.confirm('¿Eliminar este pago? La cuota volverá a quedar pendiente.')) return
    try {
      await del.mutateAsync(p.id)
      toast.success('Pago eliminado')
    } catch {
      toast.error('No se pudo eliminar')
    }
  }

  return (
    <Card className="divide-y divide-slate-100">
      {data.map((p) => {
        const rec = receiptOf(p.receipts)
        return (
          <div key={p.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={p.participant?.full_name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-slate-800">
                  {p.participant?.full_name}
                </p>
                {rec && <Badge tone="gray">{rec.number}</Badge>}
              </div>
              <p className="truncate text-xs text-slate-500">
                {p.san?.name} · {fmtDate(p.paid_at)}
              </p>
            </div>
            <p className="text-sm font-semibold text-emerald-600">{money(p.amount)}</p>
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => handleDownload(p)}
                disabled={busy === p.id}
                className="rounded-lg p-2 text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                aria-label="Descargar PDF"
                title="Descargar PDF"
              >
                {busy === p.id ? <FileText className="h-4 w-4 animate-pulse" /> : <Download className="h-4 w-4" />}
              </button>
              <button
                onClick={() =>
                  openWhatsApp(
                    p.participant?.whatsapp ?? p.participant?.phone,
                    receiptMessage({
                      participantName: p.participant?.full_name ?? '',
                      sanName: p.san?.name ?? '',
                      amount: Number(p.amount),
                      receiptNumber: rec?.number ?? '',
                      date: p.paid_at,
                      businessName: tenant?.name,
                    }),
                  )
                }
                className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                aria-label="Enviar por WhatsApp"
                title="Enviar por WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(p)}
                className="rounded-lg p-2 text-slate-300 hover:bg-red-50 hover:text-red-500"
                aria-label="Eliminar"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        )
      })}
    </Card>
  )
}
