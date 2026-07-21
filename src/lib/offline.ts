import { onlineManager, type QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import { supabase } from '@/lib/supabase'
import type { RegisterPaymentInput } from '@/hooks/payments'

/** Clave de la mutación de pago (sus defaults se registran abajo). */
export const OFFLINE_PAYMENT_KEY = ['registerPayment'] as const

/** Persistencia del cache de react-query en localStorage (lecturas offline
 *  + cola de mutaciones que sobrevive recargas). */
export const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'misanrd-query-cache',
  throttleTime: 1000,
})

/** # de mutaciones en cola (pausadas por falta de red) — pagos sin subir. */
export function pendingSyncCount(qc: QueryClient): number {
  return qc.getMutationCache().getAll().filter((m) => m.state.isPaused).length
}

/** Registra los defaults de las mutaciones que deben funcionar offline.
 *  Se hace a nivel de queryClient (no en el hook) para que una mutación en cola
 *  pueda REANUDARSE tras recargar la app (react-query re-liga por mutationKey). */
export function registerOfflineMutations(qc: QueryClient) {
  qc.setMutationDefaults(OFFLINE_PAYMENT_KEY, {
    // 'online': offline la mutación se PAUSA y entra a la cola (lo que queremos).
    // (El default global es 'always' para que el resto falle rápido offline.)
    networkMode: 'online',
    mutationFn: async (input: RegisterPaymentInput): Promise<string> => {
      const { error } = await supabase.from('payments').insert({
        id: input.id,
        tenant_id: input.tenant_id,
        created_by: input.created_by,
        san_id: input.san_id,
        installment_id: input.installment_id,
        participant_id: input.participant_id,
        amount: input.amount,
        paid_at: input.paid_at,
        method: input.method,
        notes: input.notes ?? null,
      })
      // Idempotencia: el id lo genera el cliente; si un reintento re-inserta el
      // mismo id (23505 unique_violation) lo tratamos como ya-sincronizado, así
      // un reintento nunca duplica el pago ni su recibo.
      if (error && (error as { code?: string }).code !== '23505') throw error
      return input.id
    },
    // Optimista: refleja el pago en el cache al instante (corre aunque la mutación
    // quede en pausa por falta de red). Actualiza la cuota Y el historial de pagos.
    onMutate: async (input: RegisterPaymentInput) => {
      await qc.cancelQueries({ queryKey: ['installments', input.san_id] })
      const prevInst = qc.getQueriesData({ queryKey: ['installments', input.san_id] })
      const prevPay = qc.getQueriesData({ queryKey: ['payments'] })

      // Nombre del participante (para el historial) desde el cache de cuotas.
      let participantName: string | null = null
      for (const [, data] of prevInst) {
        if (Array.isArray(data)) {
          const row = data.find(
            (it: Record<string, unknown>) => it.participant_id === input.participant_id,
          ) as { participant?: { full_name?: string | null } } | undefined
          if (row?.participant?.full_name) {
            participantName = row.participant.full_name
            break
          }
        }
      }

      qc.setQueriesData({ queryKey: ['installments', input.san_id] }, (old: unknown) => {
        if (!Array.isArray(old)) return old
        return old.map((it: Record<string, unknown>) => {
          if (it.id !== input.installment_id) return it
          const paid = Number(it.paid_amount) + Number(input.amount)
          const amount = Number(it.amount)
          return {
            ...it,
            paid_amount: paid,
            status: paid >= amount ? 'paid' : paid > 0 ? 'partial' : 'pending',
          }
        })
      })

      qc.setQueriesData({ queryKey: ['payments'] }, (old: unknown) => {
        if (!Array.isArray(old)) return old
        return [
          {
            id: input.id,
            amount: input.amount,
            paid_at: input.paid_at,
            method: input.method,
            notes: input.notes ?? null,
            san_id: input.san_id,
            san: null,
            participant: {
              id: input.participant_id,
              full_name: participantName,
              phone: null,
              whatsapp: null,
            },
            receipts: null,
            _pendingSync: true,
          },
          ...old,
        ]
      })

      return { prevInst, prevPay }
    },
    onError: (_err, _input, ctx) => {
      const c = ctx as { prevInst?: [readonly unknown[], unknown][]; prevPay?: [readonly unknown[], unknown][] } | undefined
      c?.prevInst?.forEach(([key, data]) => qc.setQueryData(key as readonly unknown[], data))
      c?.prevPay?.forEach(([key, data]) => qc.setQueryData(key as readonly unknown[], data))
    },
    // Al sincronizar (online), refresca los datos reales (recibo, totales, etc.).
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: ['installments', input.san_id] })
      qc.invalidateQueries({ queryKey: ['san', input.san_id] })
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['morosos'] })
    },
    retry: 3,
  })

  // Al recuperar la red, intenta subir la cola — SOLO si hay sesión válida.
  onlineManager.subscribe((online) => {
    if (online) void resumeIfAuthed(qc)
  })
}

/**
 * Reanuda la cola SOLO si hay sesión autenticada. Clave para no perder pagos:
 * si se reanudara sin sesión (tras cerrar sesión, o al hidratar antes del login),
 * el insert correría como `anon`, RLS lo rechazaría (42501) y el reintento
 * "quemaría" el pago (pasa a error → deja de persistirse). Con este guard la cola
 * queda PAUSADA hasta que el usuario correcto vuelva a iniciar sesión.
 */
export async function resumeIfAuthed(qc: QueryClient): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (!uid) return // sin sesión: la cola queda PAUSADA (no se quema como anon)
    // Reanuda SOLO los pagos del usuario actual: en un dispositivo compartido,
    // no "quema" (RLS 42501) los pagos encolados por otra cuenta; quedan pausados
    // hasta que su dueño vuelva a iniciar sesión.
    const paused = qc.getMutationCache().getAll().filter((m) => m.state.isPaused)
    await Promise.all(
      paused
        .filter((m) => {
          const vars = m.state.variables as { created_by?: string | null } | undefined
          return !vars?.created_by || vars.created_by === uid
        })
        .map((m) => m.continue().catch(() => {})),
    )
  } catch {
    /* noop */
  }
}

/** Sube la cola offline (si hay red y sesión) y espera a que drene. Úsalo ANTES de
 *  cerrar sesión para no perder pagos. Devuelve las que quedaron sin subir. */
export async function flushOfflineQueue(qc: QueryClient): Promise<number> {
  if (onlineManager.isOnline()) {
    await resumeIfAuthed(qc)
  }
  return pendingSyncCount(qc)
}

/**
 * Limpia SOLO las lecturas (cache de queries + cache de lecturas del SW) al cerrar
 * sesión, por higiene en dispositivos compartidos. CONSERVA a propósito la cola de
 * mutaciones (pagos sin subir) para NO perder dinero: se reintentará cuando el mismo
 * usuario vuelva a iniciar sesión con conexión. El persister re-guarda el estado
 * (queries vacías + mutaciones en cola), así que la cola sobrevive.
 *
 * Nota: si otra cuenta inicia sesión en el mismo dispositivo antes de sincronizar,
 * las mutaciones en cola fallarán por RLS (tenant distinto) — falla segura, sin
 * escritura cross-tenant.
 */
export async function clearOfflineCache(qc: QueryClient) {
  qc.getQueryCache().clear() // borra lecturas; NO toca la cola de mutaciones
  if (typeof caches !== 'undefined') {
    try {
      await caches.delete('supabase-read')
    } catch {
      /* noop */
    }
  }
}
