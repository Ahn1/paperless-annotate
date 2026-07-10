import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FileQuestion, LayoutGrid, List, Table2, CheckSquare } from 'lucide-react'
import { NativeSelect } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/misc'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useSettings, type DocumentViewMode } from '@/stores/settings'
import { useLookups, useSavedViews } from '@/hooks/data'
import type { DocumentFilters, DocumentOrdering } from '@/api/types'
import {
  countActiveFilters,
  filtersFromSearchParams,
  filtersToSearchParams,
  savedViewToFilters,
  useDocumentsInfinite,
} from './documentQuery'
import { SearchBar } from './SearchBar'
import { FilterPanel } from './FilterPanel'
import { DocumentCard, DocumentRow, DocumentTable } from './DocumentItems'
import { BulkActionsBar } from './BulkActionsBar'
import { PullToRefresh } from '@/components/PullToRefresh'

const orderings: { value: DocumentOrdering; key: 'documents.sort.created' | 'documents.sort.added' | 'documents.sort.title' | 'documents.sort.correspondent' | 'documents.sort.asn' }[] = [
  { value: '-created', key: 'documents.sort.created' },
  { value: '-added', key: 'documents.sort.added' },
  { value: 'title', key: 'documents.sort.title' },
  { value: 'correspondent__name', key: 'documents.sort.correspondent' },
  { value: '-archive_serial_number', key: 'documents.sort.asn' },
]

export function DocumentListPage({ inboxOnly = false }: { inboxOnly?: boolean }) {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const { viewMode, setViewMode } = useSettings()
  const lookups = useLookups()
  const savedViews = useSavedViews()

  const viewId = searchParams.get('view')
  const savedView = viewId ? savedViews.data?.find((v) => v.id === Number(viewId)) : undefined

  const filters: DocumentFilters = useMemo(() => {
    const base = savedView ? savedViewToFilters(savedView) : {}
    const fromUrl = filtersFromSearchParams(searchParams)
    const merged = { ...base, ...fromUrl }
    if (inboxOnly) merged.inbox = true
    return merged
  }, [searchParams, savedView, inboxOnly])

  const urlSort = searchParams.get('sort') as DocumentOrdering | null
  const ordering: DocumentOrdering =
    urlSort ??
    (savedView?.sort_field ? (`${savedView.sort_reverse ? '-' : ''}${savedView.sort_field}` as DocumentOrdering) : '-created')

  const query = useDocumentsInfinite(filters, ordering)
  const documents = useMemo(() => query.data?.pages.flatMap((p) => p.results) ?? [], [query.data])
  const totalCount = query.data?.pages[0]?.count

  // Auswahl / Bulk-Modus
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  useEffect(() => {
    if (!selectionMode) setSelectedIds(new Set())
  }, [selectionMode])
  const toggleSelect = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  // Infinite Scroll über Sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage()
      },
      { rootMargin: '600px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage, query])

  function updateFilters(next: DocumentFilters) {
    const params = filtersToSearchParams(next, searchParams)
    params.delete('view') // manuelle Filteränderung löst die gespeicherte Ansicht ab
    setSearchParams(params, { replace: true })
  }

  const activeCount = countActiveFilters(filters)
  const focusSearch = searchParams.get('focus') === 'search'

  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4">
      <PullToRefresh onRefresh={() => query.refetch()} />
      {/* Kopf */}
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="ui-chrome text-xl font-bold text-ink">
          {savedView?.name ?? (inboxOnly ? t('nav.inbox') : t('documents.title'))}
          {totalCount != null && <span className="ml-2 text-sm font-normal text-ink-faint">{totalCount}</span>}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <NativeSelect
            className="h-11 w-auto"
            value={ordering}
            onChange={(e) => {
              const params = new URLSearchParams(searchParams)
              params.set('sort', e.target.value)
              setSearchParams(params, { replace: true })
            }}
          >
            {orderings.map((o) => (
              <option key={o.value} value={o.value}>
                {t(o.key)}
              </option>
            ))}
          </NativeSelect>
          <ViewModeToggle mode={viewMode} onChange={setViewMode} />
          <Button
            variant={selectionMode ? 'primary' : 'outline'}
            size="icon"
            onClick={() => setSelectionMode((m) => !m)}
            aria-label="Auswahl"
          >
            <CheckSquare className="size-4.5" />
          </Button>
        </div>
      </div>

      {/* Suche + Filter */}
      <div className="flex gap-2">
        <SearchBar
          value={filters.query ?? ''}
          autoFocus={focusSearch}
          onSearch={(q) => updateFilters({ ...filters, query: q || undefined })}
          className="flex-1"
        />
        <FilterPanel filters={filters} ordering={ordering} onChange={updateFilters} activeCount={activeCount} />
      </div>

      {/* Inhalt */}
      {query.isLoading ? (
        <SkeletonGrid mode={viewMode} />
      ) : documents.length === 0 ? (
        <EmptyState icon={FileQuestion} title={t('documents.noResults')} />
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              lookups={lookups}
              selected={selectedIds.has(document.id)}
              selectionMode={selectionMode}
              onToggleSelect={() => toggleSelect(document.id)}
            />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="overflow-hidden rounded-2xl border border-line bg-surface-1">
          {documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              lookups={lookups}
              selected={selectedIds.has(document.id)}
              selectionMode={selectionMode}
              onToggleSelect={() => toggleSelect(document.id)}
            />
          ))}
        </div>
      ) : (
        <DocumentTable documents={documents} lookups={lookups} selectedIds={selectedIds} onToggleSelect={toggleSelect} />
      )}

      <div ref={sentinelRef} className="h-1" />
      {query.isFetchingNextPage && <SkeletonGrid mode={viewMode} rows={1} />}

      {selectionMode && selectedIds.size > 0 && (
        <BulkActionsBar
          selectedIds={[...selectedIds]}
          onDone={() => {
            setSelectionMode(false)
            void query.refetch()
          }}
        />
      )}
    </div>
  )
}

function ViewModeToggle({ mode, onChange }: { mode: DocumentViewMode; onChange: (mode: DocumentViewMode) => void }) {
  const items = [
    { value: 'cards' as const, icon: LayoutGrid },
    { value: 'list' as const, icon: List },
    { value: 'table' as const, icon: Table2 },
  ]
  return (
    <div className="ui-chrome hidden items-center gap-0.5 rounded-xl border border-line bg-surface-1 p-1 sm:flex">
      {items.map((item) => (
        <button
          key={item.value}
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-lg p-2 transition-colors',
            mode === item.value ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2',
          )}
          aria-label={item.value}
        >
          <item.icon className="size-4.5" />
        </button>
      ))}
    </div>
  )
}

function SkeletonGrid({ mode, rows = 2 }: { mode: DocumentViewMode; rows?: number }) {
  if (mode === 'cards') {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {Array.from({ length: rows * 5 }, (_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
        ))}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: rows * 4 }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  )
}
