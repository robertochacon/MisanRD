// Tipos del dominio (espejo del esquema en supabase/migrations).
// Para regenerar desde el esquema real: `npm run types:gen`.

export type SanFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'
export type SanStatus = 'draft' | 'active' | 'completed' | 'cancelled'
export type OrderType = 'manual' | 'random'
export type ParticipantStatus = 'active' | 'suspended'
export type InstallmentStatus = 'pending' | 'partial' | 'paid'
export type PayoutStatus = 'pending' | 'delivered'
export type PaymentMethod = 'cash' | 'transfer' | 'yape' | 'bank' | 'other'
export type PlanCode = 'basic' | 'entrepreneur' | 'premium'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled'
export type MemberRole = 'owner' | 'admin'

export interface Tenant {
  id: string
  name: string
  logo_url: string | null
  whatsapp: string | null
  phone: string | null
  email: string | null
  address: string | null
  bank_name: string | null
  bank_account: string | null
  signature_url: string | null
  currency: string
  receipt_seq: number
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  tenant_id: string | null
  full_name: string | null
  avatar_url: string | null
  role: MemberRole
  created_at: string
}

export interface Subscription {
  id: string
  tenant_id: string
  plan: PlanCode
  status: SubscriptionStatus
  started_at: string
  trial_ends_at: string | null
  current_period_end: string | null
}

export interface Participant {
  id: string
  tenant_id: string
  full_name: string
  phone: string | null
  whatsapp: string | null
  cedula: string | null
  address: string | null
  photo_url: string | null
  status: ParticipantStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface San {
  id: string
  tenant_id: string
  name: string
  description: string | null
  contribution_amount: number
  frequency: SanFrequency
  participant_count: number
  start_date: string
  order_type: OrderType
  status: SanStatus
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SanParticipant {
  id: string
  tenant_id: string
  san_id: string
  participant_id: string
  position: number
  created_at: string
}

export interface PayoutSchedule {
  id: string
  tenant_id: string
  san_id: string
  period_number: number
  scheduled_date: string
  recipient_participant_id: string
  expected_amount: number
  status: PayoutStatus
}

export interface Installment {
  id: string
  tenant_id: string
  san_id: string
  san_participant_id: string
  participant_id: string
  period_number: number
  due_date: string
  amount: number
  paid_amount: number
  status: InstallmentStatus
}

export interface Payment {
  id: string
  tenant_id: string
  san_id: string
  installment_id: string | null
  participant_id: string
  amount: number
  paid_at: string
  method: PaymentMethod
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Delivery {
  id: string
  tenant_id: string
  san_id: string
  payout_schedule_id: string
  recipient_participant_id: string
  amount: number
  delivered_on: string
  delivered_time: string | null
  signature_url: string | null
  receipt_image_url: string | null
  notes: string | null
  created_at: string
}

export interface Receipt {
  id: string
  tenant_id: string
  payment_id: string
  number: string
  qr_payload: string | null
  created_at: string
}

export interface PortalToken {
  id: string
  tenant_id: string
  participant_id: string
  token: string
  created_at: string
}

export interface DashboardSummary {
  active_sanes: number
  completed_sanes: number
  draft_sanes: number
  total_participants: number
  active_participants: number
  pending_installments: number
  pending_amount: number
  collected_today: number
  collected_total: number
  overdue_installments: number
  morosos_count: number
  next_payout: {
    date: string
    amount: number
    recipient: string
    san: string
  } | null
}
