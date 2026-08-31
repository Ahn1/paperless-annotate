import { ArrowLeft } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/**
 * Zurück-Knopf, der sein Ziel benennt. Er geht immer eine Ebene hoch, nie in
 * den Verlauf. Der eigene Stil (Rahmen, Fläche) hält ihn von den Werkzeug-
 * Knöpfen daneben auseinander.
 */
export function BackButton({
  label,
  onClick,
  className,
  showLabelFrom = 'md',
}: {
  /** Name des Ziels, z. B. „Posteingang“. */
  label: string
  onClick: () => void
  className?: string
  /** Ab welcher Breite der Zielname neben dem Pfeil steht. */
  showLabelFrom?: 'md' | 'lg'
}) {
  const t = useT()
  const title = t('common.backTo', { target: label })

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={cn(
        'ui-chrome inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-2.5',
        'text-sm font-medium text-ink transition-colors hover:bg-surface-3 active:bg-surface-3',
        'focus-visible:outline-2 focus-visible:outline-accent outline-offset-2',
        className,
      )}
    >
      <ArrowLeft className="size-5 shrink-0" />
      <span className={cn('max-w-32 truncate', showLabelFrom === 'lg' ? 'hidden lg:inline' : 'hidden md:inline')}>
        {label}
      </span>
    </button>
  )
}
