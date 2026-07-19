import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts'
import { TrendingUp, Wallet, Clock, FileSpreadsheet, Lock, BarChart3 } from 'lucide-react'
import { useReports } from '@/hooks/reports'
import { useRecentPayments } from '@/hooks/payments'
import { useMorosos } from '@/hooks/morosos'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardBody, CardHeader } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { PageLoader, EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { money } from '@/lib/format'
import { PAYMENT_METHOD_LABEL } from '@/lib/constants'
import { useAuth } from '@/auth/AuthProvider'

const PIE_COLORS = ['#1e63f0', '#fbb614', '#10b981', '#8b5cf6', '#64748b']
const STATUS_COLORS = ['#10b981', '#fbb614', '#ef4444']

export function ReportsPage() {
  const { data, isLoading } = useReports()
  const { plan } = useAuth()
  const toast = useToast()
  const { data: payments } = useRecentPayments(1000)
  const { data: morosos } = useMorosos()
  const [exporting, setExporting] = useState(false)

  const canExcel = plan.code !== 'basic'

  if (isLoading || !data) return <PageLoader />

  const exportExcel = async () => {
    if (!canExcel) {
      toast.error('Exportar a Excel está disponible en el plan Emprendedora o superior.')
      return
    }
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      const pays = (payments ?? []).map((p) => ({
        Fecha: p.paid_at,
        Participante: p.participant?.full_name ?? '',
        San: p.san?.name ?? '',
        Monto: Number(p.amount),
        Método: PAYMENT_METHOD_LABEL[p.method],
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pays), 'Pagos')

      const mor = (morosos ?? []).map((m) => ({
        Participante: m.participant.full_name,
        Teléfono: m.participant.phone ?? '',
        'Cuotas vencidas': m.overdueCount,
        'Monto adeudado': m.overdueAmount,
      }))
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mor), 'Morosos')

      XLSX.writeFile(wb, `MisanRD-reporte-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Excel descargado')
    } catch {
      toast.error('No se pudo exportar')
    } finally {
      setExporting(false)
    }
  }

  const hasData = data.paymentsCount > 0 || data.totalPending > 0

  return (
    <div>
      <PageHeader
        title="Reportes"
        description="El pulso financiero de tu negocio"
        action={
          <Button variant={canExcel ? 'primary' : 'outline'} onClick={exportExcel} loading={exporting}>
            {canExcel ? <FileSpreadsheet className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            Exportar Excel
          </Button>
        }
      />

      {!hasData ? (
        <EmptyState
          icon={<BarChart3 className="h-5 w-5" />}
          title="Aún no hay datos"
          description="Cuando registres pagos verás aquí tus gráficas y reportes."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total recibido" value={money(data.totalCollected)} icon={<Wallet className="h-5 w-5" />} tone="green" />
            <StatCard label="Por cobrar" value={money(data.totalPending)} icon={<Clock className="h-5 w-5" />} tone="amber" />
            <StatCard label="Pagos registrados" value={data.paymentsCount} icon={<TrendingUp className="h-5 w-5" />} tone="blue" />
          </div>

          <Card>
            <CardHeader title="Ingresos por mes" />
            <CardBody>
              {data.byMonth.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-400">Sin datos aún.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byMonth} margin={{ left: -10, right: 8, top: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} tickFormatter={(v) => money(v)} />
                      <Tooltip formatter={(v: number) => money(v)} cursor={{ fill: '#f1f5f9' }} />
                      <Bar dataKey="total" fill="#1e63f0" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="Por método de pago" />
              <CardBody>
                {data.byMethod.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Sin datos.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.byMethod} dataKey="total" nameKey="label" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                          {data.byMethod.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => money(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Estado de las cuotas" />
              <CardBody>
                {data.byStatus.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">Sin datos.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45} paddingAngle={2}>
                          {data.byStatus.map((_, i) => (
                            <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
