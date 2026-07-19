import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type {
  Installment,
  Participant,
  PayoutSchedule,
  San,
  SanFrequency,
  SanParticipant,
} from '@/types/db'

export interface SanListItem extends San {
  san_participants: { count: number }[]
}

export function useSanes() {
  return useQuery({
    queryKey: ['sanes'],
    queryFn: async (): Promise<SanListItem[]> => {
      const { data, error } = await supabase
        .from('sanes')
        .select('*, san_participants(count)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as SanListItem[]
    },
  })
}

export interface SanMember extends SanParticipant {
  participant: Participant
}
export interface PayoutRow extends PayoutSchedule {
  recipient: Pick<Participant, 'id' | 'full_name' | 'phone' | 'whatsapp'>
}
export interface SanDetail {
  san: San
  members: SanMember[]
  payouts: PayoutRow[]
  installments: Installment[]
  participants: Record<string, Participant>
}

export function useSan(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ['san', id],
    queryFn: async (): Promise<SanDetail> => {
      const [{ data: san, error: e1 }, members, payouts, installments] = await Promise.all([
        supabase.from('sanes').select('*').eq('id', id!).single(),
        supabase
          .from('san_participants')
          .select('*, participant:participants(*)')
          .eq('san_id', id!)
          .order('position', { ascending: true }),
        supabase
          .from('payout_schedule')
          .select('*, recipient:participants!recipient_participant_id(id, full_name, phone, whatsapp)')
          .eq('san_id', id!)
          .order('period_number', { ascending: true }),
        supabase.from('installments').select('*').eq('san_id', id!),
      ])
      if (e1) throw e1
      if (members.error) throw members.error
      if (payouts.error) throw payouts.error
      if (installments.error) throw installments.error

      const memberRows = members.data as unknown as SanMember[]
      const participants: Record<string, Participant> = {}
      memberRows.forEach((m) => {
        if (m.participant) participants[m.participant.id] = m.participant
      })

      return {
        san: san as San,
        members: memberRows,
        payouts: payouts.data as unknown as PayoutRow[],
        installments: installments.data as Installment[],
        participants,
      }
    },
  })
}

export interface CreateSanInput {
  name: string
  description?: string | null
  contribution_amount: number
  frequency: SanFrequency
  start_date: string
  order_type: 'manual' | 'random'
  /** IDs de participantes en el orden de entrega (posición 1..N). */
  orderedParticipantIds: string[]
}

export function useCreateSan() {
  const qc = useQueryClient()
  const { tenant, user } = useAuth()
  return useMutation({
    mutationFn: async (input: CreateSanInput): Promise<string> => {
      if (!tenant) throw new Error('Sin tenant')

      // 1) Crear el San (borrador)
      const { data: san, error: e1 } = await supabase
        .from('sanes')
        .insert({
          tenant_id: tenant.id,
          name: input.name,
          description: input.description ?? null,
          contribution_amount: input.contribution_amount,
          frequency: input.frequency,
          participant_count: input.orderedParticipantIds.length,
          start_date: input.start_date,
          order_type: input.order_type,
          status: 'draft',
          created_by: user?.id ?? null,
        })
        .select('id')
        .single()
      if (e1) throw e1
      const sanId = (san as { id: string }).id

      // 2) Insertar participantes con su turno
      const rows = input.orderedParticipantIds.map((pid, i) => ({
        tenant_id: tenant.id,
        san_id: sanId,
        participant_id: pid,
        position: i + 1,
      }))
      const { error: e2 } = await supabase.from('san_participants').insert(rows)
      if (e2) throw e2

      // 3) Generar cronograma + activar (RPC)
      const { error: e3 } = await supabase.rpc('generate_san_schedule', { p_san_id: sanId })
      if (e3) throw e3

      return sanId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sanes'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useCancelSan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sanes').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['sanes'] })
      qc.invalidateQueries({ queryKey: ['san', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
