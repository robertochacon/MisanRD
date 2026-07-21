import { useEffect, useState } from 'react'
import { onlineManager, useMutationState } from '@tanstack/react-query'
import { CloudOff, RefreshCw } from 'lucide-react'

/** Barra fina que avisa cuando no hay conexión o hay cambios por sincronizar. */
export function OfflineBar() {
  const [online, setOnline] = useState(onlineManager.isOnline())

  useEffect(() => onlineManager.subscribe((v) => setOnline(v)), [])

  // En cola (pausadas por falta de red) vs subiéndose ahora mismo.
  const queued = useMutationState({
    filters: { predicate: (m) => m.state.isPaused },
  }).length
  const syncing = useMutationState({
    filters: { predicate: (m) => m.state.status === 'pending' && !m.state.isPaused },
  }).length

  if (online && queued === 0 && syncing === 0) return null

  return (
    <div
      className={
        online
          ? 'flex items-center justify-center gap-2 bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700'
          : 'flex items-center justify-center gap-2 bg-slate-800 px-4 py-1.5 text-xs font-medium text-white'
      }
    >
      {!online ? (
        <>
          <CloudOff className="h-3.5 w-3.5" />
          Sin conexión — mostrando datos guardados
          {queued > 0 && ` · ${queued} por subir`}
        </>
      ) : (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          Sincronizando {syncing + queued} cambio{syncing + queued === 1 ? '' : 's'}…
        </>
      )}
    </div>
  )
}
