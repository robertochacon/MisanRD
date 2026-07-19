import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { initials } from '@/lib/format'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand-500', className)} />
}

export function PageLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20 text-slate-400">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name?: string | null
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const dim = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg' }[size]
  if (src) {
    return (
      <img
        src={src}
        alt={name ?? ''}
        className={cn('rounded-full object-cover', dim, className)}
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700',
        dim,
        className,
      )}
    >
      {initials(name)}
    </span>
  )
}
