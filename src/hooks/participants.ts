import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type { Participant, PortalToken } from '@/types/db'

export function useParticipants() {
  return useQuery({
    queryKey: ['participants'],
    queryFn: async (): Promise<Participant[]> => {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data as Participant[]
    },
  })
}

export function usePortalTokens() {
  return useQuery({
    queryKey: ['portal-tokens'],
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase
        .from('participant_portal_tokens')
        .select('participant_id, token')
      if (error) throw error
      const map: Record<string, string> = {}
      ;(data as Pick<PortalToken, 'participant_id' | 'token'>[]).forEach((t) => {
        map[t.participant_id] = t.token
      })
      return map
    },
  })
}

export interface ParticipantInput {
  full_name: string
  phone?: string | null
  whatsapp?: string | null
  cedula?: string | null
  address?: string | null
  status?: 'active' | 'suspended'
  notes?: string | null
}

export function useCreateParticipant() {
  const qc = useQueryClient()
  const { tenant } = useAuth()
  return useMutation({
    mutationFn: async (input: ParticipantInput): Promise<Participant> => {
      if (!tenant) throw new Error('Sin tenant')
      const { data, error } = await supabase
        .from('participants')
        .insert({ ...input, tenant_id: tenant.id })
        .select('*')
        .single()
      if (error) throw error
      return data as Participant
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participants'] })
      qc.invalidateQueries({ queryKey: ['portal-tokens'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

/** Rota (revoca) el token del portal de un participante; invalida el enlace anterior. */
export function useRotatePortalToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (participantId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('rotate_portal_token', {
        p_participant_id: participantId,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['portal-tokens'] })
    },
  })
}

export function useUpdateParticipant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: ParticipantInput & { id: string }) => {
      const { error } = await supabase.from('participants').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['participants'] })
    },
  })
}
