import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const baseField =
  'w-full h-11 px-3.5 rounded-xl border border-line bg-surface-1 text-ink text-sm placeholder:text-ink-faint ' +
  'focus:outline-2 focus:outline-accent outline-offset-0 focus:border-accent transition-colors disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(baseField, className)} {...props} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(baseField, 'h-auto min-h-24 py-2.5', className)} {...props} />
  },
)

export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function NativeSelect({ className, ...props }, ref) {
    return <select ref={ref} className={cn(baseField, 'appearance-none pr-8', className)} {...props} />
  },
)

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="ui-chrome block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="ui-chrome block text-xs text-ink-muted">{hint}</span>}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  )
}
