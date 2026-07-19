import { Badge } from '@/components/ui/Badge'
import type {
  InstallmentStatus,
  ParticipantStatus,
  PayoutStatus,
  SanStatus,
} from '@/types/db'

export function SanStatusBadge({ status }: { status: SanStatus }) {
  const map = {
    draft: { tone: 'gray', label: 'Borrador' },
    active: { tone: 'green', label: 'Activo' },
    completed: { tone: 'blue', label: 'Terminado' },
    cancelled: { tone: 'red', label: 'Cancelado' },
  } as const
  const s = map[status]
  return <Badge tone={s.tone}>{s.label}</Badge>
}

export function InstallmentStatusBadge({
  status,
  overdue,
}: {
  status: InstallmentStatus
  overdue?: boolean
}) {
  if (status === 'paid') return <Badge tone="green">Pagada</Badge>
  if (status === 'partial') return <Badge tone="amber">Parcial</Badge>
  return overdue ? <Badge tone="red">Vencida</Badge> : <Badge tone="gray">Pendiente</Badge>
}

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return status === 'delivered' ? (
    <Badge tone="green">Entregado</Badge>
  ) : (
    <Badge tone="amber">Pendiente</Badge>
  )
}

export function ParticipantStatusBadge({ status }: { status: ParticipantStatus }) {
  return status === 'active' ? (
    <Badge tone="green">Activo</Badge>
  ) : (
    <Badge tone="gray">Suspendido</Badge>
  )
}
