import { Link } from 'react-router-dom'
import { Calendar, User } from 'lucide-react'
import type { PaperlessDocument } from '@/api/types'
import { AuthImage } from '@/components/AuthImage'
import { TagChip } from '@/components/ui/misc'
import { useLookups } from '@/hooks/data'
import { useLocale } from '@/lib/i18n'
import { cn, formatDate } from '@/lib/utils'

type Lookups = ReturnType<typeof useLookups>

export function DocumentCard({
  document,
  lookups,
  selected,
  selectionMode,
  onToggleSelect,
}: {
  document: PaperlessDocument
  lookups: Lookups
  selected: boolean
  selectionMode: boolean
  onToggleSelect: () => void
}) {
  const locale = useLocale()
  const correspondent = document.correspondent ? lookups.correspondentById.get(document.correspondent) : null

  return (
    <Link
      to={`/documents/${document.id}`}
      onClick={(e) => {
        if (selectionMode) {
          e.preventDefault()
          onToggleSelect()
        }
      }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border bg-surface-1 shadow-sm transition-shadow hover:shadow-md',
        selected ? 'border-accent ring-2 ring-accent' : 'border-line',
      )}
    >
      <AuthImage documentId={document.id} alt={document.title} className="aspect-[3/2] w-full border-b border-line" />
      {selectionMode && (
        <span
          className={cn(
            'absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border-2 text-xs font-bold',
            selected ? 'border-accent bg-accent text-accent-fg' : 'border-white bg-black/30 text-transparent',
          )}
        >
          ✓
        </span>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        {correspondent && <p className="ui-chrome truncate text-xs font-medium text-accent">{correspondent.name}</p>}
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{document.title}</h3>
        <div className="mt-auto flex flex-wrap gap-1 pt-1">
          {document.tags.slice(0, 3).map((tagId) => {
            const tag = lookups.tagById.get(tagId)
            return tag ? <TagChip key={tagId} tag={tag} small /> : null
          })}
          {document.tags.length > 3 && <span className="text-[11px] text-ink-faint">+{document.tags.length - 3}</span>}
        </div>
        <p className="ui-chrome flex items-center gap-1 text-xs text-ink-faint">
          <Calendar className="size-3" />
          {formatDate(document.created, locale)}
        </p>
      </div>
    </Link>
  )
}

export function DocumentRow({
  document,
  lookups,
  selected,
  selectionMode,
  onToggleSelect,
}: {
  document: PaperlessDocument
  lookups: Lookups
  selected: boolean
  selectionMode: boolean
  onToggleSelect: () => void
}) {
  const locale = useLocale()
  const correspondent = document.correspondent ? lookups.correspondentById.get(document.correspondent) : null

  return (
    <Link
      to={`/documents/${document.id}`}
      onClick={(e) => {
        if (selectionMode) {
          e.preventDefault()
          onToggleSelect()
        }
      }}
      className={cn(
        'flex items-center gap-3 border-b border-line px-3 py-2.5 transition-colors hover:bg-surface-2',
        selected && 'bg-accent-soft',
      )}
    >
      <AuthImage documentId={document.id} alt="" className="h-14 w-11 shrink-0 rounded-md border border-line" />
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-medium text-ink">{document.title}</h3>
        <p className="ui-chrome flex items-center gap-2 truncate text-xs text-ink-muted">
          {correspondent && (
            <span className="flex items-center gap-1">
              <User className="size-3" />
              {correspondent.name}
            </span>
          )}
          <span>{formatDate(document.created, locale)}</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {document.tags.slice(0, 4).map((tagId) => {
            const tag = lookups.tagById.get(tagId)
            return tag ? <TagChip key={tagId} tag={tag} small /> : null
          })}
        </div>
      </div>
    </Link>
  )
}

export function DocumentTable({
  documents,
  lookups,
  selectedIds,
  onToggleSelect,
}: {
  documents: PaperlessDocument[]
  lookups: Lookups
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
}) {
  const locale = useLocale()
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-surface-1">
      <table className="w-full min-w-[42rem] text-sm">
        <thead>
          <tr className="ui-chrome border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
            <th className="w-8 px-3 py-2.5" />
            <th className="px-3 py-2.5">Titel</th>
            <th className="px-3 py-2.5">Korrespondent</th>
            <th className="px-3 py-2.5">Typ</th>
            <th className="px-3 py-2.5">Tags</th>
            <th className="px-3 py-2.5">Erstellt</th>
            <th className="px-3 py-2.5">ASN</th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id} className={cn('border-b border-line last:border-0 hover:bg-surface-2', selectedIds.has(document.id) && 'bg-accent-soft')}>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectedIds.has(document.id)}
                  onChange={() => onToggleSelect(document.id)}
                  className="size-4 accent-(--accent)"
                />
              </td>
              <td className="max-w-64 px-3 py-2">
                <Link to={`/documents/${document.id}`} className="block truncate font-medium text-ink hover:text-accent">
                  {document.title}
                </Link>
              </td>
              <td className="px-3 py-2 text-ink-muted">
                {document.correspondent ? (lookups.correspondentById.get(document.correspondent)?.name ?? '–') : '–'}
              </td>
              <td className="px-3 py-2 text-ink-muted">
                {document.document_type ? (lookups.documentTypeById.get(document.document_type)?.name ?? '–') : '–'}
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {document.tags.slice(0, 3).map((tagId) => {
                    const tag = lookups.tagById.get(tagId)
                    return tag ? <TagChip key={tagId} tag={tag} small /> : null
                  })}
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-ink-muted">{formatDate(document.created, locale)}</td>
              <td className="px-3 py-2 text-ink-muted">{document.archive_serial_number ?? '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
