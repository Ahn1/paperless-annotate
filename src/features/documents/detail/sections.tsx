import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, FileText, Send, Trash2 } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT, useLocale } from '@/lib/i18n'
import { formatBytes, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/misc'
import type { PaperlessDocument } from '@/api/types'

export function NotesSection({ document }: { document: PaperlessDocument }) {
  const t = useT()
  const api = useApi()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const [text, setText] = useState('')

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'document', document.id] })

  const addMutation = useMutation({
    mutationFn: () => api.addNote(document.id, text),
    onSuccess: () => {
      setText('')
      void invalidate()
    },
  })
  const deleteMutation = useMutation({
    mutationFn: (noteId: number) => api.deleteNote(document.id, noteId),
    onSuccess: invalidate,
  })

  return (
    <Section title={t('detail.notes')}>
      <ul className="space-y-2">
        {document.notes.map((note) => (
          <li key={note.id} className="group rounded-xl bg-surface-2 p-3">
            <p className="whitespace-pre-wrap text-sm text-ink">{note.note}</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="ui-chrome text-xs text-ink-faint">{formatDate(note.created, locale, true)}</span>
              <button
                onClick={() => deleteMutation.mutate(note.id)}
                className="ui-chrome text-ink-faint opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                aria-label={t('common.delete')}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (text.trim()) addMutation.mutate()
        }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('detail.addNote')}
          className="min-h-11 flex-1"
          rows={1}
        />
        <Button type="submit" size="icon" variant="outline" loading={addMutation.isPending} aria-label={t('detail.addNote')}>
          <Send className="size-4" />
        </Button>
      </form>
    </Section>
  )
}

export function ContentSection({ document }: { document: PaperlessDocument }) {
  const t = useT()
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const content = document.content ?? ''
  if (!content) return null

  return (
    <Section
      title={t('detail.content')}
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigator.clipboard.writeText(content).then(() => {
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            })
          }}
        >
          <Copy className="size-3.5" />
          {copied ? t('detail.copied') : t('detail.copyContent')}
        </Button>
      }
    >
      <pre
        onClick={() => setExpanded(true)}
        className={`allow-context-menu select-text whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-sans text-sm text-ink-muted ${expanded ? '' : 'max-h-48 cursor-pointer overflow-hidden'}`}
      >
        {content}
      </pre>
    </Section>
  )
}

export function FileInfoSection({ document }: { document: PaperlessDocument }) {
  const t = useT()
  const api = useApi()
  const { data: metadata } = useQuery({
    queryKey: [api.client.baseUrl, 'metadata', document.id],
    queryFn: () => api.getMetadata(document.id),
    staleTime: 5 * 60 * 1000,
  })

  const rows: [string, string | number | undefined][] = [
    [t('detail.fileSize'), metadata ? formatBytes(metadata.original_size) : undefined],
    [t('detail.mimeType'), metadata?.original_mime_type],
    [t('detail.pageCount'), document.page_count ?? undefined],
    [t('detail.checksum'), metadata?.original_checksum],
  ]

  return (
    <Section title={t('detail.fileInfo')}>
      <dl className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-3 text-sm">
            <dt className="ui-chrome shrink-0 text-ink-muted">{label}</dt>
            {value === undefined ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <dd className="allow-context-menu min-w-0 select-text truncate font-mono text-xs text-ink" title={String(value)}>
                {value}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </Section>
  )
}

export function SimilarDocuments({ documentId }: { documentId: number }) {
  const t = useT()
  const api = useApi()
  const locale = useLocale()
  const { data } = useQuery({
    queryKey: [api.client.baseUrl, 'similar', documentId],
    queryFn: ({ signal }) =>
      api.listDocuments({ page: 1, pageSize: 5, filters: { moreLikeId: documentId }, signal }),
    staleTime: 5 * 60 * 1000,
  })

  if (!data || data.results.length === 0) return null
  return (
    <Section title={t('detail.similar')}>
      <ul className="divide-y divide-line">
        {data.results.map((similar) => (
          <li key={similar.id}>
            <Link to={`/documents/${similar.id}`} className="flex items-center gap-2 py-2 text-sm hover:bg-surface-2">
              <FileText className="size-4 shrink-0 text-ink-faint" />
              <span className="min-w-0 flex-1 truncate text-ink">{similar.title}</span>
              <span className="ui-chrome shrink-0 text-xs text-ink-faint">{formatDate(similar.created, locale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="ui-chrome text-sm font-semibold uppercase tracking-wide text-ink-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
