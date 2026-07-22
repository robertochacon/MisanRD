/**
 * Extrae un mensaje legible de un error.
 *
 * Los errores de Supabase (PostgrestError) son objetos planos con `.message`,
 * NO instancias de `Error`, así que un `err instanceof Error ? err.message : ...`
 * los pierde y muestra un genérico. Esta función maneja ambos casos.
 *
 * Además limpia el prefijo técnico de los límites de plan que lanzan los triggers
 * de la DB (`PLAN_LIMIT_XXX: mensaje amigable` → `mensaje amigable`).
 */
export function errorMessage(err: unknown, fallback = 'Ocurrió un error'): string {
  let msg = fallback
  if (err instanceof Error && err.message) {
    msg = err.message
  } else if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message?: unknown }).message === 'string' &&
    (err as { message: string }).message
  ) {
    msg = (err as { message: string }).message
  }
  // "PLAN_LIMIT_SANES: El plan Básico permite..." → "El plan Básico permite..."
  if (msg.includes('PLAN_LIMIT')) {
    return msg.split(':').slice(1).join(':').trim()
  }
  return msg
}
