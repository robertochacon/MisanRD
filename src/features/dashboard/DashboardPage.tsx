import { Link } from 'react-router-dom'
import {
  Coins,
  Users,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  CalendarClock,
  Plus,
  ArrowRight,
  Clock,
} from 'lucide-react'
import { useDashboard } from '@/hooks/dashboard'
import { useRecentPayments, receiptNumber } from '@/hooks/payments'
import { PageHeader } from '@/components/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageLoader, EmptyState, Avatar } from '@/components/ui/misc'
import { Badge } from '@/components/ui/Badge'
import { money, fmtDate } from '@/lib/format'
import { useAuth } from '@/auth/AuthProvider'

export function DashboardPage() {
  const { profile } = useAuth()
  const { data, isLoading } = useDashboard()
  const { data: payments } = useRecentPayments(6)

  if (isLoading || !data) return <PageLoader />

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Administradora'

  return (
    <div>
      <PageHeader
        title={`¡Hola, ${firstName}! 👋`}
        description="Este es el resumen de tu negocio"
        action={
          <Link to="/sanes/nuevo">
            <Button>
              <Plus className="h-4 w-4" /> Nuevo San
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Sanes activos"
          value={data.active_sanes}
          icon={<Coins className="h-5 w-5" />}
          tone="blue"
          hint={`${data.completed_sanes} terminados`}
        />
        <StatCard
          label="Participantes"
          value={data.total_participants}
          icon={<Users className="h-5 w-5" />}
          tone="slate"
          hint={`${data.active_participants} activos`}
        />
        <StatCard
          label="Recibido hoy"
          value={money(data.collected_today)}
          icon={<Wallet className="h-5 w-5" />}
          tone="green"
        />
        <StatCard
          label="Por cobrar"
          value={money(data.pending_amount)}
          icon={<Clock className="h-5 w-5" />}
          tone="amber"
          hint={`${data.pending_installments} cuotas`}
        />
        <StatCard
          label="Morosos"
          value={data.morosos_count}
          icon={<AlertTriangle className="h-5 w-5" />}
          tone="red"
          hint={`${data.overdue_installments} cuotas vencidas`}
        />
        <StatCard
          label="Total recibido"
          value={money(data.collected_total)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="gold"
        />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {/* Próxima entrega */}
        <Card className="lg:col-span-1">
          <CardHeader title="Próxima entrega" />
          <CardBody>
            {data.next_payout ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 rounded-xl bg-brand-50 p-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500 text-white">
                    <CalendarClock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-800">
                      {data.next_payout.recipient}
                    </p>
                    <p className="truncate text-sm text-slate-500">{data.next_payout.san}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">{fmtDate(data.next_payout.date)}</span>
                  <span className="text-lg font-bold text-brand-600">
                    {money(data.next_payout.amount)}
                  </span>
                </div>
                <Link to="/entregas">
                  <Button variant="secondary" className="w-full">
                    Ver entregas <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <EmptyState
                icon={<CalendarClock className="h-5 w-5" />}
                title="Sin entregas próximas"
                description="Cuando tengas Sanes activos verás aquí la siguiente entrega."
              />
            )}
          </CardBody>
        </Card>

        {/* Pagos recientes */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Pagos recientes"
            action={
              <Link to="/pagos" className="text-sm font-medium text-brand-600 hover:underline">
                Ver todos
              </Link>
            }
          />
          <CardBody className="p-0">
            {payments && payments.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <Avatar name={p.participant?.full_name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {p.participant?.full_name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {p.san?.name} · {fmtDate(p.paid_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-emerald-600">{money(p.amount)}</p>
                      {receiptNumber(p.receipts) && (
                        <Badge tone="gray">{receiptNumber(p.receipts)}</Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={<Wallet className="h-5 w-5" />}
                  title="Aún no hay pagos"
                  description="Registra tu primer pago desde un San activo."
                  action={
                    <Link to="/pagos">
                      <Button size="sm">Registrar pago</Button>
                    </Link>
                  }
                />
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
