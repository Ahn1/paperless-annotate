import {
  ArrowLeft,
  Check,
  Eraser,
  FileStack,
  Highlighter,
  MousePointer2,
  PenLine,
  Redo2,
  Type,
  Undo2,
  type LucideIcon,
} from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

function Tool({ icon: Icon, active }: { icon: LucideIcon; active?: boolean }) {
  return (
    <span
      className={cn(
        'flex size-7 items-center justify-center rounded-lg',
        active ? 'bg-accent text-accent-fg shadow-sm' : 'text-ink-muted',
      )}
    >
      <Icon className="size-4" />
    </span>
  )
}

/** Stilisierter Annotations-Editor: Toolbar, PDF-Seite mit Markierung, Textfeld und nachgezeichneter Unterschrift. */
export function EditorMockup({ className }: { className?: string }) {
  const t = useT()
  return (
    <div aria-hidden className={cn('ui-chrome pointer-events-none select-none', className)}>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface-1 shadow-2xl">
        {/* Werkzeugleiste */}
        <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
          <ArrowLeft className="size-4 text-ink-faint" />
          <span className="hidden text-xs font-medium text-ink-muted sm:block">Mietvertrag-2026.pdf</span>
          <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
            <Tool icon={MousePointer2} />
            <Tool icon={PenLine} active />
            <Tool icon={Highlighter} />
            <Tool icon={Type} />
            <Tool icon={Eraser} />
            <span className="mx-1 h-5 w-px bg-line" />
            <Tool icon={Undo2} />
            <Tool icon={Redo2} />
            <span className="ml-1 flex h-7 items-center gap-1 rounded-lg bg-accent px-2.5 text-xs font-semibold text-accent-fg">
              <Check className="size-3.5" />
              {t('landing.mockSave')}
            </span>
          </div>
        </div>

        {/* Seitenbereich */}
        <div className="bg-surface-2 px-5 pb-9 pt-7 sm:px-12 sm:pb-12 sm:pt-9">
          <div className="relative mx-auto max-w-xl rounded-md bg-surface-1 p-6 shadow-md ring-1 ring-line sm:p-9">
            {/* Versions-Chip */}
            <span className="absolute -right-2 -top-3 flex rotate-2 items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg shadow-lg sm:-right-5">
              <FileStack className="size-3.5" />
              {t('landing.mockVersion')}
            </span>

            {/* Briefkopf */}
            <div className="h-3.5 w-36 rounded bg-ink/80" />
            <div className="mt-2 h-2 w-24 rounded bg-surface-3" />

            {/* Absatz mit markierter Zeile */}
            <div className="mt-7 space-y-2.5">
              <div className="h-2 w-full rounded bg-surface-3" />
              <div className="relative h-2 w-11/12 rounded bg-surface-3">
                <div className="absolute -inset-x-1 -inset-y-1.5 rounded bg-accent/25" />
              </div>
              <div className="h-2 w-full rounded bg-surface-3" />
              <div className="h-2 w-4/5 rounded bg-surface-3" />
            </div>

            {/* Verschiebbares Textfeld mit Griffen */}
            <div className="relative mt-7 inline-block rounded-lg border-2 border-dashed border-accent bg-accent-soft px-3.5 py-2.5">
              <div className="h-2 w-28 rounded bg-ink/70" />
              <div className="mt-1.5 h-2 w-20 rounded bg-ink/40" />
              <span className="absolute -left-1.5 -top-1.5 size-2.5 rounded-full border-2 border-accent bg-surface-1" />
              <span className="absolute -right-1.5 -top-1.5 size-2.5 rounded-full border-2 border-accent bg-surface-1" />
              <span className="absolute -bottom-1.5 -left-1.5 size-2.5 rounded-full border-2 border-accent bg-surface-1" />
              <span className="absolute -bottom-1.5 -right-1.5 size-2.5 rounded-full border-2 border-accent bg-surface-1" />
            </div>

            {/* Unterschrift auf der Signaturlinie */}
            <div className="mt-8">
              <svg viewBox="0 0 260 64" className="h-12 w-56 max-w-full" fill="none">
                <path
                  d="M10 46 C 34 8, 48 58, 72 36 S 108 10, 124 40 S 156 62, 178 28 S 216 18, 248 34"
                  pathLength={300}
                  className="animate-draw stroke-accent"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="mt-1 h-px w-56 max-w-full bg-ink/30" />
              <div className="mt-2 h-2 w-24 rounded bg-surface-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
