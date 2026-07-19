import { useEffect, useState } from 'react'
import {
  PackageCheck,
  MessageCircle,
  CalendarClock,
  CheckCircle2,
  Upload,
} from 'lucide-react'
import { usePayouts, useRegisterDelivery, type PayoutRow } from '@/hooks/deliveries'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Field, Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Select'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { PayoutStatusBadge } from '@/components/StatusBadges'
import { useToast } from '@/components/ui/toast'
import { money, fmtDate } from '@/lib/format'
import { cn } from '@/lib/cn'
import { openWhatsApp, payoutMessage } from '@/lib/whatsapp'
import { uploadFile } from '@/lib/storage'
import { useAuth } from '@/auth/AuthProvider'

export function DeliveriesPage() {
  const { data, isLoading } = usePayouts()
  const { tenant } = useAuth()
  const [selected, setSelected] = useState<PayoutRow | null>(null)

  if (isLoading) return <PageLoader />

  const pending = (data ?? []).filter((p) => p.status === 'pending')
  const delivered = (data ?? []).filter((p) => p.status === 'delivered')

  return (
    <div>
      <PageHeader title="Entregas" description="Registra la entrega del dinero a cada beneficiario" />

      {(!data || data.length === 0) && (
        <EmptyState
          icon={<PackageCheck className="h-5 w-5" />}
          title="Sin entregas"
          description="Cuando actives un San verás aquí el calendario de entregas."
        />
      )}

      {pending.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Pendientes
          </h2>
          <div className="space-y-3">
            {pending.map((p) => (
              <PayoutCard
                key={p.id}
                payout={p}
                businessName={tenant?.name}
                onDeliver={() => setSelected(p)}
              />
            ))}
          </div>
        </section>
      )}

      {delivered.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Entregadas
          </h2>
          <div className="space-y-3">
            {delivered.map((p) => (
              <PayoutCard key={p.id} payout={p} businessName={tenant?.name} />
            ))}
          </div>
        </section>
      )}

      <DeliveryModal open={!!selected} onClose={() => setSelected(null)} payout={selected} />
    </div>
  )
}

function PayoutCard({
  payout,
  businessName,
  onDeliver,
}: {
  payout: PayoutRow
  businessName?: string | null
  onDeliver?: () => void
}) {
  const isPending = payout.status === 'pending'
  const soon = isPending && new Date(payout.scheduled_date) <= new Date()

  return (
    <Card className="flex items-center gap-3 p-4">
      <span
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          isPending ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600',
        )}
      >
        {isPending ? <CalendarClock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
      </span>
      <Avatar name={payout.recipient?.full_name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-800">{payout.recipient?.full_name}</p>
        <p className="truncate text-xs text-slate-500">
          {payout.san?.name} · Turno #{payout.period_number} · {fmtDate(payout.scheduled_date)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold text-brand-600">{money(payout.expected_amount)}</p>
        <PayoutStatusBadge status={payout.status} />
      </div>
      {isPending && (
        <div className="flex flex-col gap-1">
          <button
            onClick={() =>
              openWhatsApp(
                payout.recipient?.whatsapp ?? payout.recipient?.phone,
                payoutMessage({
                  participantName: payout.recipient?.full_name ?? '',
                  sanName: payout.san?.name ?? '',
                  amount: Number(payout.expected_amount),
                  businessName,
                }),
              )
            }
            className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
            aria-label="Avisar por WhatsApp"
            title="Avisar por WhatsApp"
          >
            <MessageCircle className="h-4 w-4" />
          </button>
          <Button size="sm" variant={soon ? 'primary' : 'outline'} onClick={onDeliver}>
            Entregar
          </Button>
        </div>
      )}
    </Card>
  )
}

function DeliveryModal({
  open,
  onClose,
  payout,
}: {
  open: boolean
  onClose: () => void
  payout: PayoutRow | null
}) {
  const toast = useToast()
  const register = useRegisterDelivery()
  const { tenant } = useAuth()
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (open && payout) {
      setDate(new Date().toISOString().slice(0, 10))
      setTime('')
      setAmount(String(payout.expected_amount))
      setNotes('')
      setFile(null)
    }
  }, [open, payout])

  if (!payout) return null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    try {
      let receiptPath: string | null = null
      if (file && tenant) {
        const { path } = await uploadFile('receipts', tenant.id, file, 'entrega-')
        receiptPath = path
      }
      await register.mutateAsync({
        payout_schedule_id: payout.id,
        san_id: payout.san_id,
        recipient_participant_id: payout.recipient_participant_id,
        amount: Number(amount) || Number(payout.expected_amount),
        delivered_on: date,
        delivered_time: time || null,
        receipt_image_url: receiptPath,
        notes: notes || null,
      })
      toast.success('Entrega registrada ✅')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al registrar la entrega')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar entrega"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="delivery-form" type="submit" loading={register.isPending || uploading}>
            Confirmar entrega
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <p className="font-semibold text-slate-800">{payout.recipient?.full_name}</p>
        <p className="text-sm text-slate-500">
          {payout.san?.name} · Turno #{payout.period_number}
        </p>
        <p className="mt-1 text-sm">
          Monto a entregar:{' '}
          <span className="font-semibold text-brand-600">{money(payout.expected_amount)}</span>
        </p>
      </div>

      <form id="delivery-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Fecha" required className="col-span-2">
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Hora">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Field label="Monto entregado" required>
          <Input
            type="number"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Comprobante (opcional)" hint="Foto del recibo o transferencia">
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-500 hover:bg-slate-50">
            <Upload className="h-4 w-4" />
            {file ? file.name : 'Subir imagen'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </Field>
        <Field label="Observaciones (opcional)">
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </form>
    </Modal>
  )
}
