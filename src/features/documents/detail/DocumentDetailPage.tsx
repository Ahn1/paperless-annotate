import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as Tabs from '@radix-ui/react-tabs'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowLeft, BookOpen, Check, Download, FileQuestion, MoreVertical, PenLine, Trash2 } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { useTags } from '@/hooks/data'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner, EmptyState } from '@/components/ui/misc'
import { MetadataForm } from './MetadataForm'
import { PreviewPane } from './PreviewPane'
import { ContentSection, FileInfoSection, NotesSection, SimilarDocuments } from './sections'
import { VersionsSection } from './VersionsSection'

export function DocumentDetailPage() {
  const { id } = useParams()
  const documentId = Number(id)
  const t = useT()
  const api = useApi()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: tags = [] } = useTags()
  // Nur eine Vorschau mounten (Desktop-Grid ODER Phone-Tabs): die PDF-Engine
  // (WASM) soll nicht doppelt in einer per CSS versteckten Ansicht laufen.
  const isDesktop = useMediaQuery('(min-width: 768px)')

  const { data: document, isLoading } = useQuery({
    queryKey: [api.client.baseUrl, 'document', documentId],
    queryFn: () => api.getDocument(documentId),
    enabled: Number.isFinite(documentId),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteDocument(documentId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'documents'] })
      navigate('/documents')
    },
  })

  const inboxTagIds = tags.filter((tag) => tag.is_inbox_tag).map((tag) => tag.id)
  const hasInboxTag = document?.tags.some((tagId) => inboxTagIds.includes(tagId)) ?? false

  const inboxDoneMutation = useMutation({
    mutationFn: () =>
      api.updateDocument(documentId, { tags: document!.tags.filter((tagId) => !inboxTagIds.includes(tagId)) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl] })
      navigate('/inbox')
    },
  })

  async function download(original: boolean) {
    if (!document) return
    const blob = original ? await api.downloadOriginal(documentId) : await api.downloadArchive(documentId)
    const url = URL.createObjectURL(blob)
    const anchor = window.document.createElement('a')
    anchor.href = url
    anchor.download = document.original_file_name ?? `${document.title}.pdf`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) return <CenteredSpinner />
  if (!document) {
    return (
      <div className="p-4">
        <EmptyState icon={FileQuestion} title={t('detail.notFound')} />
      </div>
    )
  }

  const metadataColumn = (
    <div className="space-y-4">
      <div className="rounded-2xl border border-line bg-surface-1 p-4">
        <MetadataForm document={document} />
      </div>
      <VersionsSection document={document} />
      <NotesSection document={document} />
      <FileInfoSection document={document} />
      <SimilarDocuments documentId={document.id} />
      <ContentSection document={document} />
    </div>
  )

  return (
    <div className="mx-auto flex h-full max-w-7xl flex-col p-4">
      {/* Kopfzeile */}
      <div className="mb-4 flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label={t('common.back')}>
          <ArrowLeft className="size-5" />
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold text-ink">{document.title}</h1>

        {hasInboxTag && (
          <Button variant="outline" size="sm" loading={inboxDoneMutation.isPending} onClick={() => inboxDoneMutation.mutate()}>
            <Check className="size-4" />
            <span className="hidden sm:inline">{t('detail.inboxDone')}</span>
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={() => navigate(`/documents/${document.id}/read`)}>
          <BookOpen className="size-4" />
          <span className="hidden sm:inline">{t('reader.open')}</span>
        </Button>

        <Button size="sm" onClick={() => navigate(`/documents/${document.id}/annotate`)}>
          <PenLine className="size-4" />
          <span className="hidden sm:inline">{t('detail.annotate')}</span>
        </Button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label={t('nav.more')}>
              <MoreVertical className="size-5" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={4} className="z-40 w-60 rounded-xl border border-line bg-surface-1 p-1.5 shadow-xl">
              <MenuItem onClick={() => void download(true)}>
                <Download className="size-4" />
                {t('detail.downloadOriginal')}
              </MenuItem>
              <MenuItem onClick={() => void download(false)}>
                <Download className="size-4" />
                {t('detail.downloadArchive')}
              </MenuItem>
              <DropdownMenu.Separator className="my-1 h-px bg-line" />
              <MenuItem
                destructive
                onClick={() => {
                  if (window.confirm(t('common.confirmDelete'))) deleteMutation.mutate()
                }}
              >
                <Trash2 className="size-4" />
                {t('detail.deleteDocument')}
              </MenuItem>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Tablet/Desktop: zwei Spalten – Phone: Tabs */}
      {isDesktop && (
        <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[24rem_1fr] lg:grid-cols-[28rem_1fr]">
          <div className="overflow-y-auto pb-4">{metadataColumn}</div>
          <PreviewPane documentId={document.id} className="h-full min-h-[60vh] w-full rounded-2xl border border-line bg-surface-2" />
        </div>
      )}

      {!isDesktop && (
        <Tabs.Root defaultValue="metadata" className="flex min-h-0 flex-1 flex-col">
          <Tabs.List className="ui-chrome mb-3 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
            {(['metadata', 'preview'] as const).map((tab) => (
              <Tabs.Trigger
                key={tab}
                value={tab}
                className="rounded-lg px-3 py-2 text-sm font-medium text-ink-muted data-[state=active]:bg-surface-1 data-[state=active]:text-ink data-[state=active]:shadow-sm"
              >
                {tab === 'metadata' ? t('detail.metadata') : t('detail.preview')}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <Tabs.Content value="metadata" className="min-h-0 flex-1 overflow-y-auto pb-4">
            {metadataColumn}
          </Tabs.Content>
          <Tabs.Content value="preview" className="min-h-0 flex-1">
            <PreviewPane documentId={document.id} className="h-full min-h-[70vh] w-full rounded-2xl border border-line bg-surface-2" />
          </Tabs.Content>
        </Tabs.Root>
      )}

      {/* Verweis für die Inbox-Nutzung */}
      {hasInboxTag && (
        <p className="ui-chrome mt-2 text-center text-xs text-ink-faint md:hidden">
          <Link to="/inbox" className="text-accent">
            {t('nav.inbox')}
          </Link>
        </p>
      )}
    </div>
  )
}

function MenuItem({
  children,
  onClick,
  destructive,
}: {
  children: React.ReactNode
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <DropdownMenu.Item
      onSelect={onClick}
      className={`ui-chrome flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-surface-2 ${destructive ? 'text-danger' : 'text-ink'}`}
    >
      {children}
    </DropdownMenu.Item>
  )
}
