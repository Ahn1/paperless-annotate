import { useEffect, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import * as Slider from '@radix-ui/react-slider'
import {
  ArrowLeft,
  Eraser,
  Highlighter,
  MousePointer2,
  PanelLeft,
  PenLine,
  Redo2,
  Save,
  TextCursorInput,
  TextSelect,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { HistoryScope } from '@embedpdf/plugin-history'
import { useT, type TranslationKey } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useSettings } from '@/stores/settings'
import { SwitchRow } from '@/components/ui/Switch'
import type { EditorToolId } from './PdfEditor'

const PEN_COLORS = ['#e03131', '#1971c2', '#2f9e44', '#f08c00', '#9c36b5', '#000000', '#ffffff']

const tools: { id: EditorToolId; icon: typeof PenLine; key: TranslationKey }[] = [
  { id: 'select', icon: MousePointer2, key: 'editor.tool.select' },
  { id: 'ink', icon: PenLine, key: 'editor.tool.pen' },
  { id: 'inkHighlighter', icon: Highlighter, key: 'editor.tool.highlighter' },
  { id: 'highlight', icon: TextSelect, key: 'editor.tool.textHighlight' },
  { id: 'freeText', icon: TextCursorInput, key: 'editor.tool.freeText' },
  { id: 'eraser', icon: Eraser, key: 'editor.tool.eraser' },
]

export function EditorToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onRedo,
  history,
  onZoomIn,
  onZoomOut,
  onToggleThumbs,
  onSave,
  onExit,
  dirty,
  title,
}: {
  activeTool: EditorToolId
  onToolChange: (tool: EditorToolId) => void
  onUndo: () => void
  onRedo: () => void
  history: HistoryScope | null
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleThumbs: () => void
  onSave: () => void
  onExit: () => void
  dirty: boolean
  title: string
}) {
  const t = useT()
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })

  useEffect(() => {
    if (!history) return
    const off = history.onHistoryChange(() => {
      setHistoryState({ canUndo: history.canUndo(), canRedo: history.canRedo() })
    })
    return off
  }, [history])

  return (
    <div className="ui-chrome flex items-center gap-1 border-b border-line bg-surface-1 px-2 py-1.5 pt-safe">
      <ToolbarButton onClick={onExit} label={t('common.back')}>
        <ArrowLeft className="size-5" />
      </ToolbarButton>
      <ToolbarButton onClick={onToggleThumbs} label={t('editor.thumbnails')}>
        <PanelLeft className="size-5" />
      </ToolbarButton>

      <span className="mx-1 hidden max-w-40 truncate text-sm font-medium text-ink-muted lg:block">{title}</span>

      <div className="mx-auto flex items-center gap-0.5 rounded-xl bg-surface-2 p-1">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id
          const button = (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              title={t(tool.key)}
              aria-label={t(tool.key)}
              className={cn(
                'rounded-lg p-2 transition-colors',
                isActive ? 'bg-accent text-accent-fg shadow-sm' : 'text-ink-muted hover:bg-surface-3',
              )}
            >
              <tool.icon className="size-5" />
            </button>
          )
          // Optionen-Popover für Stift/Marker/Text bei erneutem Tipp auf aktives Werkzeug
          if (tool.id === 'ink' || tool.id === 'inkHighlighter' || tool.id === 'freeText') {
            return (
              <PenOptionsWrapper key={tool.id} enabled={isActive} tool={tool.id}>
                {button}
              </PenOptionsWrapper>
            )
          }
          return button
        })}
      </div>

      <ToolbarButton onClick={onUndo} label={t('editor.undo')} disabled={!historyState.canUndo}>
        <Undo2 className="size-5" />
      </ToolbarButton>
      <ToolbarButton onClick={onRedo} label={t('editor.redo')} disabled={!historyState.canRedo}>
        <Redo2 className="size-5" />
      </ToolbarButton>
      <ToolbarButton onClick={onZoomOut} label={t('editor.zoomOut')} className="hidden sm:inline-flex">
        <ZoomOut className="size-5" />
      </ToolbarButton>
      <ToolbarButton onClick={onZoomIn} label={t('editor.zoomIn')} className="hidden sm:inline-flex">
        <ZoomIn className="size-5" />
      </ToolbarButton>

      <button
        onClick={onSave}
        className={cn(
          'ui-chrome ml-1 flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors',
          dirty ? 'bg-accent text-accent-fg hover:opacity-90' : 'bg-surface-2 text-ink-faint',
        )}
      >
        <Save className="size-4" />
        <span className="hidden sm:inline">{t('editor.save')}</span>
      </button>
    </div>
  )
}

function ToolbarButton({
  children,
  onClick,
  label,
  disabled,
  className,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        'rounded-lg p-2 text-ink-muted transition-colors hover:bg-surface-2 disabled:opacity-35',
        className,
      )}
    >
      {children}
    </button>
  )
}

/** Optionen (Farbe/Stärke) beim zweiten Tipp auf das aktive Zeichenwerkzeug. */
function PenOptionsWrapper({
  children,
  enabled,
  tool,
}: {
  children: React.ReactNode
  enabled: boolean
  tool: 'ink' | 'inkHighlighter' | 'freeText'
}) {
  const t = useT()
  const settings = useSettings()

  if (!enabled) return <>{children}</>

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{children}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={10}
          className="ui-chrome z-50 w-64 space-y-3 rounded-2xl border border-line bg-surface-1 p-4 shadow-xl animate-fade-in"
        >
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">{t('editor.color')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {PEN_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => settings.set({ penColor: color })}
                  className={cn(
                    'size-7 rounded-full border border-line transition-transform hover:scale-110',
                    settings.penColor === color && 'ring-2 ring-accent ring-offset-2 ring-offset-surface-1',
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}
              <input
                type="color"
                value={settings.penColor}
                onChange={(e) => settings.set({ penColor: e.target.value })}
                className="size-7 cursor-pointer rounded-full border border-line bg-transparent p-0"
                aria-label={t('editor.color')}
              />
            </div>
          </div>

          {tool !== 'freeText' && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                {t('editor.width')}: {settings.penWidth.toFixed(1)}
              </p>
              <Slider.Root
                value={[settings.penWidth]}
                min={0.5}
                max={12}
                step={0.5}
                onValueChange={([value]) => settings.set({ penWidth: value })}
                className="relative flex h-5 w-full touch-none items-center"
              >
                <Slider.Track className="relative h-1.5 flex-1 rounded-full bg-surface-3">
                  <Slider.Range className="absolute h-full rounded-full bg-accent" />
                </Slider.Track>
                <Slider.Thumb className="block size-5 rounded-full bg-accent shadow" />
              </Slider.Root>
            </div>
          )}

          <SwitchRow
            label={t('settings.pen.fingerDraws')}
            checked={settings.penFingerDraws}
            onCheckedChange={(value) => settings.set({ penFingerDraws: value })}
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
