import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type { Installment, Participant, PaymentMethod } from '@/types/db'

export interface InstallmentRow extends Installment {
  participant: Pick<Participant, 'id' | 'full_name' | 'phone' | 'whatsapp'>
}

/** Cuotas de un San (con datos del participante). */
export function useSanInstallments(sanId: string | undefined, onlyPending = false) {
  return useQuery({
    enabled: !!sanId,
    queryKey: ['installments', sanId, onlyPending],
    queryFn: async (): Promise<InstallmentRow[]> => {
      let q = supabase
        .from('installments')
        .select('*, participant:participants(id, full_name, phone, whatsapp)')
        .eq('san_id', sanId!)
        .order('due_date', { ascending: true })
      if (onlyPending) q = q.neq('status', 'paid')
      const { data, error } = await q
      if (error) throw error
      return data as unknown as InstallmentRow[]
    },
  })
}

export interface RegisterPaymentInput {
  san_id: string
  installment_id: string | null
  participant_id: string
  amount: number
  paid_at: string
  method: PaymentMethod
  notes?: string | null
}

export function useRegisterPayment() {
  const qc = useQueryClient()
  const { tenant, user } = useAuth()
  return useMutation({
    mutationFn: async (input: RegisterPaymentInput): Promise<string> => {
      if (!tenant) throw new Error('Sin tenant')
      const { data, error } = await supabase
        .from('payments')
        .insert({ ...input, tenant_id: tenant.id, created_by: user?.id ?? null })
        .select('id')
        .single()
      if (error) throw error
      return (data as { id: string }).id
    },
    onSuccess: (_id, v) => {
      qc.invalidateQueries({ queryKey: ['installments', v.san_id] })
      qc.invalidateQueries({ queryKey: ['san', v.san_id] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['morosos'] })
    },
  })
}

export interface PaymentRow {
  id: string
  amount: number
  paid_at: string
  method: PaymentMethod
  notes: string | null
  san_id: string
  san: { name: string } | null
  participant: { id: string; full_name: string; phone: string | null; whatsapp: string | null } | null
  receipts: ReceiptInfo | ReceiptInfo[] | null
}

export interface ReceiptInfo {
  number: string
  qr_payload: string | null
}

export function useRecentPayments(limit = 100) {
  return useQuery({
    queryKey: ['payments', limit],
    queryFn: async (): Promise<PaymentRow[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select(
          'id, amount, paid_at, method, notes, san_id, san:sanes(name), participant:participants(id, full_name, phone, whatsapp), receipts(number, qr_payload)',
        )
        .order('paid_at', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as unknown as PaymentRow[]
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['installments'] })
      qc.invalidateQueries({ queryKey: ['san'] }) // refresca las estadísticas del detalle del San
      qc.invalidateQueries({ queryKey: ['sanes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['morosos'] })
    },
  })
}

/** Normaliza la relación de recibo (puede venir como objeto o arreglo). */
export function receiptOf(r: PaymentRow['receipts']): ReceiptInfo | null {
  if (!r) return null
  return Array.isArray(r) ? (r[0] ?? null) : r
}

/** Extrae el número de recibo. */
export function receiptNumber(r: PaymentRow['receipts']): string | null {
  return receiptOf(r)?.number ?? null
}
