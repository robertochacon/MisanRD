import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type { Participant, PayoutSchedule } from '@/types/db'

export interface PayoutRow extends PayoutSchedule {
  san: { name: string } | null
  recipient: Pick<Participant, 'id' | 'full_name' | 'phone' | 'whatsapp'> | null
}

/** Entregas programadas (payout_schedule) con San y beneficiario. */
export function usePayouts(status?: 'pending' | 'delivered') {
  return useQuery({
    queryKey: ['payouts', status ?? 'all'],
    queryFn: async (): Promise<PayoutRow[]> => {
      let q = supabase
        .from('payout_schedule')
        .select(
          '*, san:sanes(name), recipient:participants!recipient_participant_id(id, full_name, phone, whatsapp)',
        )
        .order('scheduled_date', { ascending: true })
      if (status) q = q.eq('status', status)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as PayoutRow[]
    },
  })
}

export interface RegisterDeliveryInput {
  payout_schedule_id: string
  san_id: string
  recipient_participant_id: string
  amount: number
  delivered_on: string
  delivered_time?: string | null
  signature_url?: string | null
  receipt_image_url?: string | null
  notes?: string | null
}

export function useRegisterDelivery() {
  const qc = useQueryClient()
  const { tenant, user } = useAuth()
  return useMutation({
    mutationFn: async (input: RegisterDeliveryInput) => {
      if (!tenant) throw new Error('Sin tenant')
      const { error } = await supabase
        .from('deliveries')
        .insert({ ...input, tenant_id: tenant.id, created_by: user?.id ?? null })
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['payouts'] })
      qc.invalidateQueries({ queryKey: ['san', v.san_id] })
      qc.invalidateQueries({ queryKey: ['sanes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
