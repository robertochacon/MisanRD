// PRIMERO: captura el token de los enlaces de recuperación de contraseña antes de
// que el cliente de Supabase o el HashRouter toquen el fragmento de la URL.
import '@/lib/recoveryBootstrap'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import App from './App'
import './index.css'
import { queryClient } from '@/lib/queryClient'
import { persister, registerOfflineMutations, resumeIfAuthed } from '@/lib/offline'
import { AuthProvider } from '@/auth/AuthProvider'
import { ToastProvider } from '@/components/ui/toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// Registra los defaults de las mutaciones offline ANTES de montar la app, para
// que las que estén en cola puedan reanudarse tras recargar.
registerOfflineMutations(queryClient)

// Si Vite no logra precargar un módulo (típico tras un deploy: el índice apunta a
// un chunk cuyo hash ya cambió), recarga UNA vez para traer los assets frescos.
// El guard en sessionStorage (misma clave que lazyWithRetry en App.tsx) evita el
// bucle de recargas.
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const KEY = 'misanrd-chunk-reloaded'
  if (!sessionStorage.getItem(KEY)) {
    sessionStorage.setItem(KEY, '1')
    window.location.reload()
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 14, // 14 días
        // OJO: cambiar el buster descarta TODO el cache persistido, INCLUIDA la
        // cola de pagos offline sin subir. No lo cambies en un deploy si puede
        // haber pagos en cola en dispositivos de cobradores.
        buster: 'misanrd-v1',
        dehydrateOptions: {
          // Persistir solo las mutaciones en cola (pausadas por falta de red).
          shouldDehydrateMutation: (m) => m.state.isPaused,
        },
      }}
      onSuccess={() => {
        // Cache restaurado → sube la cola SOLO si ya hay sesión (si no, se queda
        // pausada hasta el login para no correr como anon y perder el pago).
        void resumeIfAuthed(queryClient)
      }}
    >
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </PersistQueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
