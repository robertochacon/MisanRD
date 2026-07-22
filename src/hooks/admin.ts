import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type {
  AdminMember,
  AdminOverview,
  AdminPlanRequestRow,
  AdminTenantRow,
  AdminTenantSummary,
  MemberRole,
  PlanCode,
  PlatformAdminRow,
  SubscriptionStatus,
} from '@/types/db'

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

/** Solicitudes de cambio de plan pendientes (todas las cuentas). */
export function useAdminPlanRequests() {
  return useQuery({
    queryKey: ['admin', 'plan-requests'],
    queryFn: async (): Promise<AdminPlanRequestRow[]> => {
      const { data, error } = await supabase.rpc('admin_list_plan_requests')
      if (error) throw error
      return (data ?? []) as AdminPlanRequestRow[]
    },
  })
}

/** Aprueba (cambia el plan) o rechaza una solicitud de cambio de plan. */
export function useAdminResolvePlanRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc('admin_resolve_plan_request', {
        p_id: args.id,
        p_approve: args.approve,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

/** Suspende / reactiva un negocio completo. */
export function useAdminSetTenantSuspended() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { tenant: string; suspended: boolean }) => {
      const { error } = await supabase.rpc('admin_set_tenant_suspended', {
        p_tenant: args.tenant,
        p_suspended: args.suspended,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

/** Resumen (dashboard) de un negocio para el detalle. */
export function useAdminTenantSummary(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'tenant-summary', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async (): Promise<AdminTenantSummary> => {
      const { data, error } = await supabase.rpc('admin_tenant_summary', { p_tenant: tenantId })
      if (error) throw error
      return data as AdminTenantSummary
    },
  })
}

// ── Usuarios por negocio ─────────────────────────────────────────────────────
export function useAdminMembers(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'members', tenantId],
    enabled: Boolean(tenantId),
    queryFn: async (): Promise<AdminMember[]> => {
      const { data, error } = await supabase.rpc('admin_list_members', { p_tenant: tenantId })
      if (error) throw error
      return (data ?? []) as AdminMember[]
    },
  })
}

export function useAdminSetMemberRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { user: string; role: MemberRole }) => {
      const { error } = await supabase.rpc('admin_set_member_role', { p_user: args.user, p_role: args.role })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useAdminRemoveMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (user: string) => {
      const { error } = await supabase.rpc('admin_remove_member', { p_user: user })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useAdminSetUserBanned() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { user: string; banned: boolean }) => {
      const { error } = await supabase.rpc('admin_set_user_banned', { p_user: args.user, p_banned: args.banned })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

// ── Super-admins de plataforma ───────────────────────────────────────────────
export function useAdminPlatformAdmins() {
  return useQuery({
    queryKey: ['admin', 'platform-admins'],
    queryFn: async (): Promise<PlatformAdminRow[]> => {
      const { data, error } = await supabase.rpc('admin_list_platform_admins')
      if (error) throw error
      return (data ?? []) as PlatformAdminRow[]
    },
  })
}

export function useAdminGrantPlatformAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.rpc('admin_grant_platform_admin', { p_email: email })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'platform-admins'] }),
  })
}

export function useAdminRevokePlatformAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (user: string) => {
      const { error } = await supabase.rpc('admin_revoke_platform_admin', { p_user: user })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'platform-admins'] }),
  })
}
