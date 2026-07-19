import { addDays, addMonths } from 'date-fns'
import type { SanFrequency } from '@/types/db'

/**
 * Fecha del período `p` (1-based) según la frecuencia. Debe coincidir con la
 * función SQL `san_period_date` para que la previsualización sea fiel.
 */
export function periodDate(start: Date, freq: SanFrequency, period: number): Date {
  const k = period - 1
  switch (freq) {
    case 'daily':
      return addDays(start, k)
    case 'weekly':
      return addDays(start, k * 7)
    case 'biweekly':
      return addDays(start, k * 14)
    case 'monthly':
      return addMonths(start, k)
  }
}

export interface SchedulePreviewRow {
  period: number
  date: Date
  recipientId: string
  recipientName: string
  pot: number
}

/** Genera la vista previa del cronograma antes de activar el San. */
export function buildSchedulePreview(params: {
  start: Date
  frequency: SanFrequency
  contribution: number
  order: { id: string; name: string }[]
}): SchedulePreviewRow[] {
  const { start, frequency, contribution, order } = params
  const pot = contribution * order.length
  return order.map((p, i) => ({
    period: i + 1,
    date: periodDate(start, frequency, i + 1),
    recipientId: p.id,
    recipientName: p.name,
    pot,
  }))
}

/** Baraja una copia del arreglo (Fisher-Yates). */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** El "pot" (monto que recibe quien le toca) = cuota × cantidad de participantes. */
export function potAmount(contribution: number, participants: number): number {
  return contribution * participants
}
