import type { ReactNode } from 'react'
import { Loader2, type LucideIcon } from 'lucide-react'
import { cn, contrastColor } from '@/lib/utils'
import type { Tag } from '@/api/types'

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-6 animate-spin text-ink-muted', className)} />
}

export function CenteredSpinner() {
  return (
    <div className="flex h-40 items-center justify-center">
      <Spinner />
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-skeleton rounded-lg bg-surface-3', className)} />
}

export function EmptyState({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="ui-chrome flex flex-col items-center justify-center gap-2 py-16 text-center">
      <Icon className="size-10 text-ink-faint" />
      <p className="font-medium text-ink-muted">{title}</p>
      {children && <div className="text-sm text-ink-faint">{children}</div>}
    </div>
  )
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'ui-chrome inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function TagChip({ tag, onRemove, small }: { tag: Tag; onRemove?: () => void; small?: boolean }) {
  const bg = tag.color || '#a0a0a0'
  return (
    <span
      className={cn(
        'ui-chrome inline-flex max-w-full items-center gap-1 rounded-full font-medium',
        small ? 'px-2 py-px text-[11px]' : 'px-2.5 py-0.5 text-xs',
      )}
      style={{ backgroundColor: bg, color: tag.text_color || contrastColor(bg) }}
    >
      <span className="truncate">{tag.name}</span>
      {onRemove && (
        <button onClick={onRemove} className="opacity-70 hover:opacity-100" aria-label="remove">
          ×
        </button>
      )}
    </span>
  )
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">{children}</div>
  )
}

export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-ink">{children}</div>
  )
}
