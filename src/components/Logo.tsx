import { cn } from '@/lib/cn'

const src = `${import.meta.env.BASE_URL}logo.png`

/** Logo con imagen. */
export function Logo({ className }: { className?: string }) {
  return <img src={src} alt="MisanRD" className={cn('object-contain', className)} />
}

/** Marca (logo + wordmark) para encabezados. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <img src={src} alt="" className="h-9 w-9 object-contain" />
      <div className="leading-none">
        <span className="text-lg font-extrabold tracking-tight text-brand-950">
          Misan<span className="text-brand-500">RD</span>
        </span>
      </div>
    </div>
  )
}
