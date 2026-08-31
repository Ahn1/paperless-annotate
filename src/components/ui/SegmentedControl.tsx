import { cn } from '@/lib/utils'

export interface SegmentedOption<T extends string> {
  value: T
  label: string
}

/** Auswahl aus wenigen Stufen, als Knopfreihe. */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div className={cn('ui-chrome flex gap-1 rounded-xl bg-surface-2 p-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors',
            value === option.value ? 'bg-accent text-accent-fg shadow-sm' : 'text-ink-muted hover:bg-surface-3',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/** Beschriftete Zeile mit Knopfreihe – Gegenstück zur SwitchRow. */
export function SegmentedRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string
  hint?: string
  value: T
  options: readonly SegmentedOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className="py-1">
      <div className="ui-chrome mb-1.5">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      <SegmentedControl value={value} options={options} onChange={onChange} />
    </div>
  )
}
