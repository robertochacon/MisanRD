import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { MemberRole } from '@/types/db'

export interface TeamMember {
  id: string
  full_name: string | null
  role: MemberRole
  created_at: string
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team-members'],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, created_at')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data as TeamMember[]
    },
  })
}

export interface Invite {
  id: string
  code: string
  email: string | null
  role: MemberRole
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export function usePendingInvites() {
  return useQuery({
    queryKey: ['invites'],
    queryFn: async (): Promise<Invite[]> => {
      const { data, error } = await supabase
        .from('tenant_invites')
        .select('id, code, email, role, expires_at, accepted_at, created_at')
        .is('accepted_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Invite[]
    },
  })
}

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<string> => {
      const { data, error } = await supabase.rpc('create_invite', {
        p_role: 'admin',
        p_email: null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  })
}

export function useRevokeInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tenant_invites').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  })
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async (code: string): Promise<string> => {
      const { data, error } = await supabase.rpc('accept_invite', { p_code: code.trim() })
      if (error) throw error
      return data as string
    },
  })
}
