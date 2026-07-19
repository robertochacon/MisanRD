import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tenant } from '@/types/db'

export type TenantUpdate = Partial<
  Pick<
    Tenant,
    'name' | 'whatsapp' | 'phone' | 'email' | 'address' | 'bank_name' | 'bank_account' | 'logo_url'
  >
>

export function useUpdateTenant() {
  return useMutation({
    mutationFn: async ({ id, ...patch }: TenantUpdate & { id: string }) => {
      const { error } = await supabase.from('tenants').update(patch).eq('id', id)
      if (error) throw error
    },
  })
}
