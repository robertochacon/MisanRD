import { format, parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

/** Formatea un monto como pesos dominicanos (RD$). */
export function money(amount: number | null | undefined, currency = 'DOP'): string {
  const n = Number(amount ?? 0)
  const symbol = currency === 'DOP' ? 'RD$' : ''
  return `${symbol}${n.toLocaleString('es-DO', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

/** Formatea número simple con separadores. */
export function num(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString('es-DO')
}

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? parseISO(value) : value
  return isValid(d) ? d : null
}

/** Fecha corta: 19 jul 2026 */
export function fmtDate(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "d 'de' MMM yyyy", { locale: es }) : '—'
}

/** Fecha compacta: 19/07/2026 */
export function fmtDateShort(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, 'dd/MM/yyyy', { locale: es }) : '—'
}

/** Fecha + hora: 19 jul 2026, 3:20 p. m. */
export function fmtDateTime(value: string | Date | null | undefined): string {
  const d = toDate(value)
  return d ? format(d, "d MMM yyyy, h:mm a", { locale: es }) : '—'
}

/** Día de la semana capitalizado. */
export function fmtWeekday(value: string | Date | null | undefined): string {
  const d = toDate(value)
  if (!d) return '—'
  const s = format(d, 'EEEE', { locale: es })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Iniciales para avatares. */
export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

/** Solo dígitos de un teléfono. */
export function digits(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '')
}
