import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/auth/AuthProvider'
import type { MyPlanRequest, PlanCode } from '@/types/db'

/**
 * Solicitud de cambio de plan PENDIENTE del negocio actual (o null si no hay).
 * La RLS de `plan_requests` restringe la lectura al propio tenant.
 */
export function useMyPlanRequest() {
  const { tenant } = useAuth()
  return useQuery({
    queryKey: ['plan-request', tenant?.id],
    enabled: Boolean(tenant?.id),
    queryFn: async (): Promise<MyPlanRequest | null> => {
      const { data, error } = await supabase
        .from('plan_requests')
        .select('id, requested_plan, status, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return (data?.[0] as MyPlanRequest) ?? null
    },
  })
}

/** La dueña solicita cambiar de plan; la solicitud llega al super-admin. */
export function useRequestPlanChange() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { plan: PlanCode; note?: string }): Promise<MyPlanRequest> => {
      const { data, error } = await supabase.rpc('request_plan_change', {
        p_plan: args.plan,
        p_note: args.note ?? null,
      })
      if (error) throw error
      return data as MyPlanRequest
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-request'] }),
  })
}
