// Bootstrap para los enlaces de recuperación de contraseña de Supabase.
//
// DEBE importarse PRIMERO en main.tsx (antes que cualquier módulo que cree el
// cliente de Supabase o monte el router) para ejecutarse mientras el fragmento
// de la URL todavía está intacto. Como este módulo no importa nada, su cuerpo
// corre antes que el resto de imports de main.tsx.
//
// ¿Por qué existe? Supabase, en el flujo implícito (el default), devuelve al
// usuario a la raíz de la app con el resultado del enlace en el FRAGMENTO:
//   https://misanrd.com/#access_token=...&refresh_token=...&type=recovery
// o, si el enlace expiró / es inválido:
//   https://misanrd.com/#error=access_denied&error_code=otp_expired&...
//
// Pero la app usa HashRouter, que también usa el fragmento para las rutas
// (#/login). Sin intervenir, el router interpreta "access_token=..." como una
// ruta desconocida y su catch-all navega a "#/", BORRANDO el token antes de que
// Supabase o la pantalla de restablecimiento puedan leerlo. Aquí extraemos el
// token del fragmento y reescribimos el hash a la ruta de restablecimiento para
// que el router muestre la pantalla correcta y ResetPasswordPage establezca la
// sesión con setSession().

export const RECOVERY_KEY = 'misanrd-recovery'
export const RECOVERY_ERROR_KEY = 'misanrd-recovery-error'

export interface RecoveryTokens {
  access_token: string
  refresh_token: string
}

// Transporte PRIMARIO: variables en memoria. Como reescribimos el hash con
// replaceState (sin recargar la página), el módulo sigue vivo y ResetPasswordPage
// puede leer esto directamente. Así un fallo de sessionStorage (modo privado /
// storage deshabilitado por política) NO destruye un token válido: sessionStorage
// es solo un respaldo por si hubiera una recarga.
export let capturedTokens: RecoveryTokens | null = null
export let capturedError: string | null = null

/** ResetPasswordPage lo llama tras consumir los datos, para no reutilizarlos. */
export function clearCapturedRecovery() {
  capturedTokens = null
  capturedError = null
  try {
    window.sessionStorage.removeItem(RECOVERY_KEY)
    window.sessionStorage.removeItem(RECOVERY_ERROR_KEY)
  } catch {
    // sessionStorage puede no estar disponible; el respaldo en memoria basta.
  }
}

;(function captureRecoveryFromHash() {
  if (typeof window === 'undefined') return

  // Quita el "#" (y el "/" del HashRouter, si lo hubiera) para poder parsear los
  // parámetros que Supabase deja en el fragmento.
  const raw = window.location.hash.replace(/^#\/?/, '')
  if (!raw) return

  const params = new URLSearchParams(raw)
  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  const type = params.get('type')
  const errorCode = params.get('error_code') ?? params.get('error')

  const hasRecoveryTokens = Boolean(accessToken && refreshToken && type === 'recovery')
  const hasAuthError = Boolean(errorCode)

  // Solo intervenimos ante un resultado de enlace (tokens de recuperación) o un
  // error de enlace. Cualquier otro fragmento (rutas normales de HashRouter) se
  // deja intacto.
  if (!hasRecoveryTokens && !hasAuthError) return

  if (hasRecoveryTokens) {
    capturedTokens = { access_token: accessToken!, refresh_token: refreshToken! }
    // Respaldo en sessionStorage (best-effort): sobrevive a una recarga.
    try {
      window.sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(capturedTokens))
      window.sessionStorage.removeItem(RECOVERY_ERROR_KEY)
    } catch {
      // Ignoramos: el respaldo en memoria (capturedTokens) es suficiente.
    }
  } else {
    // No podemos distinguir un error de recuperación de otros (confirmación,
    // enlace mágico…): Supabase no incluye `type` en los errores. La pantalla de
    // restablecimiento muestra un mensaje NEUTRAL para no confundir.
    capturedError = errorCode || '1'
    try {
      window.sessionStorage.setItem(RECOVERY_ERROR_KEY, capturedError)
      window.sessionStorage.removeItem(RECOVERY_KEY)
    } catch {
      // Ignoramos: el respaldo en memoria (capturedError) es suficiente.
    }
  }

  // Reescribe el hash a la ruta de restablecimiento SIN recargar ni dejar el
  // token en el historial. El router lee este hash al montarse (después de este
  // módulo), así que no hace falta emitir ningún evento.
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#/restablecer`,
  )
})()
