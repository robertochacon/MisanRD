import type { PaymentMethod, PlanCode, SanFrequency } from '@/types/db'
import { money } from '@/lib/format'

export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'MisanRD'
export const APP_TAGLINE = 'Tus sans, más fácil'

/** URL pública del sitio (para armar links del portal). */
// Nota: usar `||` (no `??`) para que un VITE_PUBLIC_URL vacío ('' en CI) también
// caiga al fallback en vez de dejar la URL rota.
export const PUBLIC_URL =
  (import.meta.env.VITE_PUBLIC_URL || '').replace(/\/$/, '') ||
  `${window.location.origin}${import.meta.env.BASE_URL}`.replace(/\/$/, '')

export const FREQUENCIES: { value: SanFrequency; label: string; every: string }[] = [
  { value: 'daily', label: 'Diario', every: 'cada día' },
  { value: 'weekly', label: 'Semanal', every: 'cada semana' },
  { value: 'biweekly', label: 'Quincenal', every: 'cada 15 días' },
  { value: 'monthly', label: 'Mensual', every: 'cada mes' },
]

export const FREQUENCY_LABEL: Record<SanFrequency, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'bank', label: 'Depósito bancario' },
  { value: 'yape', label: 'Yape' },
  { value: 'other', label: 'Otro' },
]

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  bank: 'Depósito bancario',
  yape: 'Yape',
  other: 'Otro',
}

export interface PlanInfo {
  code: PlanCode
  name: string
  price: number
  maxSanes: number | null
  maxParticipants: number | null
  features: string[]
}

/** Unidad de cobro: el plan Premium se cobra POR SAN (ya no es mensual). */
export const PLAN_PRICE_UNIT = 'por san'

export const PLANS: Record<PlanCode, PlanInfo> = {
  basic: {
    code: 'basic',
    name: 'Básico',
    price: 0, // Gratis
    maxSanes: 2,
    maxParticipants: 30,
    features: [
      'Hasta 2 sanes',
      'Hasta 30 participantes',
      'Cobros y recibos',
      'Portal para participantes',
    ],
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    price: 300, // RD$300 por san
    maxSanes: null,
    maxParticipants: null,
    features: [
      'Crea los sanes que necesites',
      'Participantes ilimitados',
      'Varios administradores',
      'Reportes y exportar a Excel',
      'Recordatorios por WhatsApp',
      'Portal para tus clientes',
    ],
  },
  // Legacy: ya no se ofrece (hoy solo Básico y Premium). Se conserva la entrada
  // para no romper tenants creados antes del cambio de planes (el tipo PlanCode
  // y la DB aún contemplan este código).
  entrepreneur: {
    code: 'entrepreneur',
    name: 'Emprendedora',
    price: 600,
    maxSanes: null,
    maxParticipants: null,
    features: ['Sanes ilimitados', 'Participantes ilimitados', 'Exportar a Excel'],
  },
}

/** Planes que se ofrecen actualmente. 'entrepreneur' quedó como legacy. */
export const PLAN_ORDER: PlanCode[] = ['basic', 'premium']

/** Etiqueta de precio de un plan: "Gratis" o "RD$X por san". */
export function planPriceLabel(plan: PlanInfo): string {
  return plan.price === 0 ? 'Gratis' : `${money(plan.price)} ${PLAN_PRICE_UNIT}`
}

/** URL del portal de solo lectura del participante (HashRouter). */
export function portalUrl(token: string): string {
  return `${PUBLIC_URL}/#/portal/${token}`
}
