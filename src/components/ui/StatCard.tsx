import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'blue' | 'green' | 'amber' | 'red' | 'gold' | 'slate'

const tones: Record<Tone, { icon: string; ring: string }> = {
  blue: { icon: 'bg-brand-50 text-brand-600', ring: 'ring-brand-100' },
  green: { icon: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
  amber: { icon: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
  red: { icon: 'bg-red-50 text-red-600', ring: 'ring-red-100' },
  gold: { icon: 'bg-gold-100 text-gold-600', ring: 'ring-gold-100' },
  slate: { icon: 'bg-slate-100 text-slate-600', ring: 'ring-slate-100' },
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'blue',
  hint,
  className,
}: {
  label: string
  value: ReactNode
  icon?: ReactNode
  tone?: Tone
  hint?: ReactNode
  className?: string
}) {
  const t = tones[tone]
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition-shadow hover:shadow-card-hover',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {icon && (
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', t.icon)}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
