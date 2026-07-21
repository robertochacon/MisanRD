import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { AdminOverview, AdminTenantRow, PlanCode, SubscriptionStatus } from '@/types/db'

/** Métricas globales de la plataforma (todas las cuentas). */
export function useAdminOverview() {
  return useQuery({
    queryKey: ['admin', 'overview'],
    queryFn: async (): Promise<AdminOverview> => {
      const { data, error } = await supabase.rpc('admin_overview')
      if (error) throw error
      return data as AdminOverview
    },
  })
}

/** Listado de todos los negocios con métricas y dueña. */
export function useAdminTenants() {
  return useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async (): Promise<AdminTenantRow[]> => {
      const { data, error } = await supabase.rpc('admin_list_tenants')
      if (error) throw error
      return (data ?? []) as AdminTenantRow[]
    },
  })
}

/** Cambia plan / estado de suscripción de un negocio. */
export function useAdminSetSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { tenant: string; plan: PlanCode; status?: SubscriptionStatus }) => {
      const { error } = await supabase.rpc('admin_set_subscription', {
        p_tenant: args.tenant,
        p_plan: args.plan,
        p_status: args.status ?? null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}
