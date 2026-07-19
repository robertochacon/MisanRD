import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-800 shadow-sm',
          'placeholder:text-slate-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30',
          'disabled:cursor-not-allowed disabled:bg-slate-50',
          className,
        )}
        {...props}
      />
    )
  },
)

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: ReactNode
  htmlFor?: string
  error?: string
  hint?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}
