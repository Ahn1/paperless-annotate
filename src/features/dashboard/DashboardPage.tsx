import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, FileText, Inbox, Tags, Type } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useSavedViews, useStatistics } from '@/hooks/data'
import { useT, useLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'
import { Skeleton } from '@/components/ui/misc'
import { AuthImage } from '@/components/AuthImage'
import { savedViewToFilters } from '@/features/documents/documentQuery'
import type { SavedView } from '@/api/types'
import { UploadZone } from './UploadZone'

export function DashboardPage() {
  const t = useT()
  const stats = useStatistics()
  const savedViews = useSavedViews()
  const dashboardViews = (savedViews.data ?? []).filter((view) => view.show_on_dashboard)

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 p-4">
      <h1 className="ui-chrome text-xl font-bold text-ink">{t('nav.dashboard')}</h1>

      {/* Statistiken */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={FileText} label={t('dashboard.total')} value={stats.data?.documents_total} />
        <StatCard icon={Inbox} label={t('dashboard.inbox')} value={stats.data?.documents_inbox} link="/inbox" />
        <StatCard icon={Type} label={t('dashboard.characters')} value={stats.data?.character_count} />
        <StatCard icon={Tags} label={t('dashboard.tags')} value={stats.data?.tag_count} link="/manage/tags" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          {/* Gespeicherte Ansichten mit Dashboard-Flag */}
          {dashboardViews.map((view) => (
            <SavedViewWidget key={view.id} view={view} />
          ))}

          {/* Zuletzt hinzugefügt */}
          <RecentDocuments />
        </div>

        {/* Upload */}
        <aside className="space-y-3">
          <h2 className="ui-chrome text-sm font-semibold uppercase tracking-wide text-ink-muted">{t('upload.title')}</h2>
          <UploadZone />
        </aside>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: typeof FileText
  label: string
  value: number | undefined
  link?: string
}) {
  const body = (
    <div className="ui-chrome flex items-center gap-3 rounded-2xl border border-line bg-surface-1 p-4 transition-colors hover:bg-surface-2">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-muted">{label}</p>
        {value == null ? (
          <Skeleton className="mt-1 h-5 w-16" />
        ) : (
          <p className="text-lg font-bold text-ink">{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  )
  return link ? <Link to={link}>{body}</Link> : body
}

function SavedViewWidget({ view }: { view: SavedView }) {
  const t = useT()
  const api = useApi()
  const locale = useLocale()
  const filters = savedViewToFilters(view)
  const ordering = view.sort_field ? `${view.sort_reverse ? '-' : ''}${view.sort_field}` : '-created'

  const { data } = useQuery({
    queryKey: [api.client.baseUrl, 'dashboard-view', view.id],
    queryFn: ({ signal }) =>
      api.listDocuments({ page: 1, pageSize: 6, ordering: ordering as never, filters, signal }),
    staleTime: 60 * 1000,
  })

  return (
    <section className="rounded-2xl border border-line bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="ui-chrome text-sm font-semibold text-ink">{view.name}</h2>
          {data && (
            <span className="ui-chrome rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
              {data.count.toLocaleString()}
            </span>
          )}
        </div>
        <Link to={`/documents?view=${view.id}`} className="ui-chrome flex items-center gap-1 text-xs font-medium text-accent">
          {t('dashboard.showAll')}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <ul className="grid gap-1 sm:grid-cols-2 2xl:grid-cols-3">
        {(data?.results ?? []).map((document) => (
          <li key={document.id} className="min-w-0">
            <Link to={`/documents/${document.id}`} className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2">
              <AuthImage documentId={document.id} alt="" className="h-14 w-11 shrink-0 rounded-md border border-line" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{document.title}</p>
                <p className="ui-chrome text-xs text-ink-faint">{formatDate(document.created, locale)}</p>
              </div>
            </Link>
          </li>
        ))}
        {!data &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="flex items-center gap-3 p-1.5">
              <Skeleton className="h-14 w-11 shrink-0 rounded-md" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
        {data && data.results.length === 0 && <li className="py-2 text-sm text-ink-faint">{t('common.empty')}</li>}
      </ul>
    </section>
  )
}

function RecentDocuments() {
  const t = useT()
  const api = useApi()
  const { data } = useQuery({
    queryKey: [api.client.baseUrl, 'recent-documents'],
    queryFn: ({ signal }) => api.listDocuments({ page: 1, pageSize: 14, ordering: '-added', signal }),
    staleTime: 60 * 1000,
  })

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="ui-chrome text-sm font-semibold uppercase tracking-wide text-ink-muted">{t('dashboard.recent')}</h2>
        <Link to="/documents" className="ui-chrome flex items-center gap-1 text-xs font-medium text-accent">
          {t('dashboard.showAll')}
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] lg:overflow-visible">
        {(data?.results ?? []).map((document) => (
          <Link
            key={document.id}
            to={`/documents/${document.id}`}
            className="w-32 shrink-0 overflow-hidden rounded-xl border border-line bg-surface-1 shadow-sm transition-shadow hover:shadow-md lg:w-auto"
          >
            <AuthImage documentId={document.id} alt={document.title} className="aspect-[3/4] w-full" />
            <p className="ui-chrome line-clamp-2 p-2 text-xs font-medium text-ink">{document.title}</p>
          </Link>
        ))}
        {!data &&
          Array.from({ length: 7 }, (_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-32 shrink-0 rounded-xl lg:w-auto" />
          ))}
      </div>
    </section>
  )
}
