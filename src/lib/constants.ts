import type { PaymentMethod, PlanCode, SanFrequency } from '@/types/db'

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

export const PLANS: Record<PlanCode, PlanInfo> = {
  basic: {
    code: 'basic',
    name: 'Básico',
    price: 300,
    maxSanes: 2,
    maxParticipants: 30,
    features: ['2 Sanes', 'Hasta 30 participantes', 'Recibos PDF', 'Reportes'],
  },
  entrepreneur: {
    code: 'entrepreneur',
    name: 'Emprendedora',
    price: 600,
    maxSanes: null,
    maxParticipants: null,
    features: [
      'Sanes ilimitados',
      'Participantes ilimitados',
      'Recordatorios WhatsApp',
      'Reportes + PDF',
      'Exportar a Excel',
    ],
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    price: 900,
    maxSanes: null,
    maxParticipants: null,
    features: [
      'Todo lo de Emprendedora',
      'Múltiples administradores',
      'Branding personalizado',
      'Respaldo automático',
    ],
  },
}

export const PLAN_ORDER: PlanCode[] = ['basic', 'entrepreneur', 'premium']

/** URL del portal de solo lectura del participante (HashRouter). */
export function portalUrl(token: string): string {
  return `${PUBLIC_URL}/#/portal/${token}`
}
