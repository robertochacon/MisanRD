import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Installment, Participant } from '@/types/db'

export interface MorosoItem {
  installment_id: string
  san_id: string
  san_name: string
  period: number
  due_date: string
  owed: number
}
export interface Moroso {
  participant: Pick<Participant, 'id' | 'full_name' | 'phone' | 'whatsapp'>
  overdueCount: number
  overdueAmount: number
  items: MorosoItem[]
}

interface Row extends Installment {
  participant: Pick<Participant, 'id' | 'full_name' | 'phone' | 'whatsapp'>
  san: { name: string } | null
}

export function useMorosos() {
  return useQuery({
    queryKey: ['morosos'],
    queryFn: async (): Promise<Moroso[]> => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('installments')
        .select(
          '*, participant:participants(id, full_name, phone, whatsapp), san:sanes(name)',
        )
        .neq('status', 'paid')
        .lt('due_date', today)
        .order('due_date', { ascending: true })
      if (error) throw error

      const rows = data as unknown as Row[]
      const map = new Map<string, Moroso>()
      for (const r of rows) {
        if (!r.participant) continue
        const owed = Number(r.amount) - Number(r.paid_amount)
        const existing = map.get(r.participant.id)
        const item: MorosoItem = {
          installment_id: r.id,
          san_id: r.san_id,
          san_name: r.san?.name ?? 'San',
          period: r.period_number,
          due_date: r.due_date,
          owed,
        }
        if (existing) {
          existing.overdueCount += 1
          existing.overdueAmount += owed
          existing.items.push(item)
        } else {
          map.set(r.participant.id, {
            participant: r.participant,
            overdueCount: 1,
            overdueAmount: owed,
            items: [item],
          })
        }
      }
      return [...map.values()].sort((a, b) => b.overdueCount - a.overdueCount)
    },
  })
}
