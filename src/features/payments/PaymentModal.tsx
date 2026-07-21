import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { Select, Textarea } from '@/components/ui/Select'
import { useToast } from '@/components/ui/toast'
import { useAuth } from '@/auth/AuthProvider'
import { useRegisterPayment, type InstallmentRow } from '@/hooks/payments'
import { PAYMENT_METHODS } from '@/lib/constants'
import { money } from '@/lib/format'
import type { PaymentMethod } from '@/types/db'

export function PaymentModal({
  open,
  onClose,
  installment,
  sanName,
  onRegistered,
}: {
  open: boolean
  onClose: () => void
  installment: InstallmentRow | null
  sanName?: string
  onRegistered?: () => void
}) {
  const toast = useToast()
  const { tenant, user } = useAuth()
  const register = useRegisterPayment()
  const owed = installment ? Number(installment.amount) - Number(installment.paid_amount) : 0

  const [amount, setAmount] = useState<string>('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (open && installment) {
      setAmount(String(owed))
      setMethod('cash')
      setDate(new Date().toISOString().slice(0, 10))
      setNotes('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, installment?.id])

  if (!installment) return null

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      toast.error('Ingresa un monto válido')
      return
    }
    if (!tenant) {
      toast.error('Sin negocio activo')
      return
    }
    // mutate (no mutateAsync): offline la mutación queda EN PAUSA y su promesa no
    // resolvería; con mutate + onMutate optimista cerramos al instante igual.
    register.mutate(
      {
        id: crypto.randomUUID(),
        san_id: installment.san_id,
        installment_id: installment.id,
        participant_id: installment.participant_id,
        amount: amt,
        paid_at: date,
        method,
        notes: notes || null,
        tenant_id: tenant.id,
        created_by: user?.id ?? null,
      },
      {
        // Online: el éxito/error sale del resultado real (no lo afirmamos antes).
        onSuccess: () => toast.success(`Pago de ${money(amt)} registrado`),
        onError: (err) =>
          toast.error(err instanceof Error ? err.message : 'Error al registrar el pago'),
      },
    )
    // Offline: la mutación queda en cola; confirmamos con el optimista aplicado.
    if (!navigator.onLine) {
      toast.success(`Pago de ${money(amt)} guardado. Se subirá al recuperar la conexión.`)
    }
    onRegistered?.()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar pago"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button form="payment-form" type="submit" loading={register.isPending}>
            Registrar
          </Button>
        </>
      }
    >
      <div className="mb-4 rounded-xl bg-slate-50 p-3">
        <p className="font-semibold text-slate-800">{installment.participant?.full_name}</p>
        <p className="text-sm text-slate-500">
          {sanName ? `${sanName} · ` : ''}Cuota #{installment.period_number}
        </p>
        <p className="mt-1 text-sm">
          Debe: <span className="font-semibold text-red-600">{money(owed)}</span>
          <span className="text-slate-400"> de {money(installment.amount)}</span>
        </p>
      </div>

      <form id="payment-form" onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto" required>
            <Input
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Fecha" required>
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Método de pago">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Observaciones (opcional)">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej. Pago parcial, transferencia #123…"
          />
        </Field>
      </form>
    </Modal>
  )
}
