import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Mensaje claro en consola si faltan las variables de entorno.
  console.error(
    '[MisanRD] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y complétalas.',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'misanrd-auth',
  },
})

export const hasSupabaseConfig = Boolean(url && anonKey)

/** URL base pública de la Edge Function `portal`. */
export const portalFunctionUrl = url ? `${url}/functions/v1/portal` : ''
