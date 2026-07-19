import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { DashboardSummary } from '@/types/db'

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<DashboardSummary> => {
      const { data, error } = await supabase.rpc('dashboard_summary')
      if (error) throw error
      return data as DashboardSummary
    },
  })
}
