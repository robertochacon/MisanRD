import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import type { PaymentMethod } from '@/types/db'

export interface ReportData {
  totalCollected: number
  totalPending: number
  paymentsCount: number
  byMonth: { month: string; total: number }[]
  byMethod: { method: PaymentMethod; label: string; total: number }[]
  byStatus: { name: string; value: number }[]
}

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  bank: 'Banco',
  yape: 'Yape',
  other: 'Otro',
}

export function useReports() {
  return useQuery({
    queryKey: ['reports'],
    queryFn: async (): Promise<ReportData> => {
      const [{ data: payments, error: e1 }, { data: installments, error: e2 }] = await Promise.all([
        supabase.from('payments').select('amount, paid_at, method'),
        supabase.from('installments').select('amount, paid_amount, status'),
      ])
      if (e1) throw e1
      if (e2) throw e2

      const pays = (payments ?? []) as { amount: number; paid_at: string; method: PaymentMethod }[]
      const insts = (installments ?? []) as { amount: number; paid_amount: number; status: string }[]

      const totalCollected = pays.reduce((a, p) => a + Number(p.amount), 0)
      const totalPending = insts
        .filter((i) => i.status !== 'paid')
        .reduce((a, i) => a + (Number(i.amount) - Number(i.paid_amount)), 0)

      // Por mes (últimos meses con actividad)
      const monthMap = new Map<string, number>()
      for (const p of pays) {
        const key = p.paid_at.slice(0, 7) // YYYY-MM
        monthMap.set(key, (monthMap.get(key) ?? 0) + Number(p.amount))
      }
      const byMonth = [...monthMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12)
        .map(([k, total]) => ({
          month: format(parseISO(`${k}-01`), 'MMM yy', { locale: es }),
          total,
        }))

      // Por método
      const methodMap = new Map<PaymentMethod, number>()
      for (const p of pays) {
        methodMap.set(p.method, (methodMap.get(p.method) ?? 0) + Number(p.amount))
      }
      const byMethod = [...methodMap.entries()].map(([method, total]) => ({
        method,
        label: METHOD_LABEL[method],
        total,
      }))

      // Por estado de cuota
      const paidCount = insts.filter((i) => i.status === 'paid').length
      const partialCount = insts.filter((i) => i.status === 'partial').length
      const pendingCount = insts.filter((i) => i.status === 'pending').length
      const byStatus = [
        { name: 'Pagadas', value: paidCount },
        { name: 'Parciales', value: partialCount },
        { name: 'Pendientes', value: pendingCount },
      ].filter((s) => s.value > 0)

      return {
        totalCollected,
        totalPending,
        paymentsCount: pays.length,
        byMonth,
        byMethod,
        byStatus,
      }
    },
  })
}
