import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

export function Switch({
  checked,
  onCheckedChange,
  className,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      className={cn(
        'ui-chrome relative h-7 w-12 shrink-0 rounded-full border border-line transition-colors',
        checked ? 'bg-accent' : 'bg-surface-3',
        className,
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block size-5.5 translate-x-0.5 rounded-full bg-white shadow transition-transform',
          checked && 'translate-x-[1.35rem]',
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="ui-chrome">
        <p className="text-sm font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
