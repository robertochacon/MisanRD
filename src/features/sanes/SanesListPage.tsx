import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Coins, Users, ChevronRight, AlertTriangle } from 'lucide-react'
import { useSanes, type SanListItem } from '@/hooks/sanes'
import { useAuth } from '@/auth/AuthProvider'
import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PageLoader, EmptyState } from '@/components/ui/misc'
import { useToast } from '@/components/ui/toast'
import { SanStatusBadge } from '@/components/StatusBadges'
import { money } from '@/lib/format'
import { FREQUENCY_LABEL, PLANS } from '@/lib/constants'
import { cn } from '@/lib/cn'
import type { SanStatus } from '@/types/db'

const FILTERS: { value: SanStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'completed', label: 'Terminados' },
  { value: 'draft', label: 'Borradores' },
]

export function SanesListPage() {
  const { data, isLoading } = useSanes()
  const { plan } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<SanStatus | 'all'>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return data ?? []
    return (data ?? []).filter((s) => s.status === filter)
  }, [data, filter])

  // Sanes que cuentan para el límite del plan (mismo criterio que el trigger de
  // la DB `enforce_san_limit`: cuenta borradores + activos).
  const activeSanes = useMemo(
    () => (data ?? []).filter((s) => s.status === 'draft' || s.status === 'active').length,
    [data],
  )
  const atLimit = plan.maxSanes != null && activeSanes >= plan.maxSanes
  const limitMsg = `El plan ${PLANS.basic.name} permite máximo ${plan.maxSanes} sanes activos. Cambia a Premium para crear más.`

  const handleNew = () => {
    if (atLimit) {
      toast.error(limitMsg)
      return
    }
    navigate('/sanes/nuevo')
  }

  if (isLoading) return <PageLoader />

  return (
    <div>
      <PageHeader
        title="Sanes"
        description={`${data?.length ?? 0} en total`}
        action={
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4" /> Nuevo San
          </Button>
        }
      />

      {atLimit && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-gold-200 bg-gold-50 p-3 text-sm text-gold-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Llegaste al límite del plan {PLANS.basic.name} ({plan.maxSanes} sanes activos).{' '}
            <Link to="/configuracion" className="font-semibold underline">
              Cambia a Premium
            </Link>{' '}
            para crear más.
          </span>
        </div>
      )}

      <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f.value
                ? 'bg-brand-500 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Coins className="h-5 w-5" />}
          title="No hay Sanes aquí"
          description="Crea tu primer San para empezar a organizar los turnos y pagos."
          action={<Button onClick={handleNew}>Crear San</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s) => (
            <SanCard key={s.id} san={s} />
          ))}
        </div>
      )}
    </div>
  )
}

function SanCard({ san }: { san: SanListItem }) {
  const count = san.san_participants?.[0]?.count ?? san.participant_count
  return (
    <Link to={`/sanes/${san.id}`}>
      <Card className="group h-full p-4 transition-shadow hover:shadow-card-hover">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
            <Coins className="h-5 w-5" />
          </div>
          <SanStatusBadge status={san.status} />
        </div>
        <h3 className="mt-3 truncate font-semibold text-slate-800">{san.name}</h3>
        <p className="mt-0.5 text-sm text-slate-500">
          {money(san.contribution_amount)} · {FREQUENCY_LABEL[san.frequency]}
        </p>
        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" /> {count} participantes
          </span>
          <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5" />
        </div>
      </Card>
    </Link>
  )
}
