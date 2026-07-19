import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Tone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'gold' | 'purple'

const tones: Record<Tone, string> = {
  gray: 'bg-slate-100 text-slate-600',
  blue: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  gold: 'bg-gold-100 text-gold-700',
  purple: 'bg-purple-50 text-purple-700',
}

export function Badge({
  children,
  tone = 'gray',
  className,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}
