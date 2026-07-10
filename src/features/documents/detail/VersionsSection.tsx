import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Columns2, Download, Eye, GitBranch, PenLine, Pencil, Trash2 } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT, useLocale } from '@/lib/i18n'
import { cn, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/misc'
import type { DocumentVersion, PaperlessDocument } from '@/api/types'
import { PreviewPane } from './PreviewPane'
import { Section } from './sections'

/**
 * Versions-Timeline (Paperless v3): Ansehen, Herunterladen, Label ändern, Löschen,
 * Vergleichen (Side-by-Side) und „Diese Version annotieren“.
 */
export function VersionsSection({ document }: { document: PaperlessDocument }) {
  const t = useT()
  const api = useApi()
  const locale = useLocale()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [viewVersion, setViewVersion] = useState<DocumentVersion | null>(null)
  const [renameVersion, setRenameVersion] = useState<DocumentVersion | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareSelection, setCompareSelection] = useState<number[]>([])
  const [comparePair, setComparePair] = useState<[DocumentVersion, DocumentVersion] | null>(null)

  const versions = [...(document.versions ?? [])].sort((a, b) => b.id - a.id)
  const rootId = document.root_document ?? document.id
  if (versions.length === 0) return null

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'document', document.id] })

  const deleteMutation = useMutation({
    mutationFn: (versionId: number) => api.deleteVersion(rootId, versionId),
    onSuccess: invalidate,
  })

  async function downloadVersion(version: DocumentVersion) {
    const blob = await api.downloadOriginal(rootId, version.id)
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = `${document.title} – ${versionName(version)}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function versionName(version: DocumentVersion): string {
    if (version.version_label) return version.version_label
    if (version.id === versions.at(-1)?.id) return t('versions.original')
    return `v${version.id}`
  }

  function toggleCompare(versionId: number) {
    setCompareSelection((prev) => {
      const next = prev.includes(versionId) ? prev.filter((id) => id !== versionId) : [...prev.slice(-1), versionId]
      if (next.length === 2) {
        const [a, b] = next.map((id) => versions.find((v) => v.id === id)!)
        setComparePair([a, b])
        setCompareMode(false)
        return []
      }
      return next
    })
  }

  const isCurrent = (version: DocumentVersion, index: number) => version.is_current ?? index === 0

  return (
    <Section
      title={t('versions.title')}
      action={
        versions.length > 1 && (
          <Button variant={compareMode ? 'primary' : 'ghost'} size="sm" onClick={() => setCompareMode((m) => !m)}>
            <Columns2 className="size-3.5" />
            {t('versions.compare')}
          </Button>
        )
      }
    >
      {compareMode && <p className="ui-chrome mb-2 text-xs text-accent">{t('versions.compareHint')}</p>}

      <ol className="relative space-y-0.5">
        {versions.map((version, index) => (
          <li key={version.id}>
            <div
              className={cn(
                'group flex items-center gap-2 rounded-xl px-2 py-2 transition-colors',
                compareMode && 'cursor-pointer hover:bg-surface-2',
                compareSelection.includes(version.id) && 'bg-accent-soft',
              )}
              onClick={compareMode ? () => toggleCompare(version.id) : undefined}
            >
              {/* Timeline-Punkt */}
              <span className="relative flex h-full flex-col items-center self-stretch px-1">
                <span
                  className={cn(
                    'mt-1.5 size-2.5 shrink-0 rounded-full',
                    isCurrent(version, index) ? 'bg-accent ring-4 ring-accent-soft' : 'bg-ink-faint',
                  )}
                />
                {index < versions.length - 1 && <span className="w-px flex-1 bg-line" />}
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink">
                  <GitBranch className="size-3.5 text-ink-faint" />
                  <span className="truncate">{versionName(version)}</span>
                  {isCurrent(version, index) && <Badge className="bg-accent text-accent-fg">{t('versions.current')}</Badge>}
                </p>
                <p className="ui-chrome text-xs text-ink-faint">{formatDate(version.created, locale, true)}</p>
              </div>

              {!compareMode && (
                <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  <IconAction title={t('versions.view')} onClick={() => setViewVersion(version)}>
                    <Eye className="size-4" />
                  </IconAction>
                  <IconAction title={t('common.download')} onClick={() => void downloadVersion(version)}>
                    <Download className="size-4" />
                  </IconAction>
                  <IconAction title={t('versions.rename')} onClick={() => setRenameVersion(version)}>
                    <Pencil className="size-4" />
                  </IconAction>
                  <IconAction
                    title={t('versions.annotateThis')}
                    onClick={() => navigate(`/documents/${rootId}/annotate?version=${version.id}`)}
                  >
                    <PenLine className="size-4" />
                  </IconAction>
                  {versions.length > 1 && (
                    <IconAction
                      title={t('common.delete')}
                      destructive
                      onClick={() => {
                        if (window.confirm(t('versions.deleteConfirm'))) deleteMutation.mutate(version.id)
                      }}
                    >
                      <Trash2 className="size-4" />
                    </IconAction>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="ui-chrome mt-2 text-xs text-ink-faint">{t('versions.uploadHint')}</p>

      {/* Version ansehen */}
      {viewVersion && (
        <Dialog open onOpenChange={(open) => !open && setViewVersion(null)}>
          <DialogContent title={versionName(viewVersion)} className="max-w-4xl">
            <PreviewPane documentId={rootId} versionId={viewVersion.id} className="h-[70dvh] w-full rounded-xl border border-line" />
          </DialogContent>
        </Dialog>
      )}

      {/* Vergleich */}
      {comparePair && (
        <Dialog open onOpenChange={(open) => !open && setComparePair(null)}>
          <DialogContent
            title={`${t('versions.compare')}: ${versionName(comparePair[0])} ↔ ${versionName(comparePair[1])}`}
            className="max-w-6xl"
          >
            <div className="grid h-[70dvh] grid-cols-1 gap-3 md:grid-cols-2">
              {comparePair.map((version) => (
                <div key={version.id} className="flex min-h-0 flex-col">
                  <p className="ui-chrome mb-1 text-center text-xs font-medium text-ink-muted">
                    {versionName(version)} · {formatDate(version.created, locale)}
                  </p>
                  <PreviewPane documentId={rootId} versionId={version.id} className="min-h-0 w-full flex-1 rounded-xl border border-line" />
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Label umbenennen */}
      {renameVersion && (
        <RenameDialog
          version={renameVersion}
          onClose={() => setRenameVersion(null)}
          onSave={async (label) => {
            await api.patchVersion(rootId, renameVersion.id, { version_label: label })
            await invalidate()
            setRenameVersion(null)
          }}
        />
      )}
    </Section>
  )
}

function IconAction({
  children,
  title,
  onClick,
  destructive,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'ui-chrome rounded-lg p-1.5 transition-colors hover:bg-surface-2',
        destructive ? 'text-danger' : 'text-ink-muted hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}

function RenameDialog({
  version,
  onClose,
  onSave,
}: {
  version: DocumentVersion
  onClose: () => void
  onSave: (label: string) => Promise<void>
}) {
  const t = useT()
  const [label, setLabel] = useState(version.version_label ?? '')
  const [busy, setBusy] = useState(false)

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={t('versions.rename')}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            setBusy(true)
            void onSave(label).finally(() => setBusy(false))
          }}
        >
          <Field label={t('versions.label')}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
          </Field>
          <Button type="submit" className="w-full" loading={busy}>
            {t('common.save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
