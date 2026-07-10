import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RotateCcw, Trash2 } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT, useLocale } from '@/lib/i18n'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { CenteredSpinner, EmptyState } from '@/components/ui/misc'

export function TrashPage() {
  const t = useT()
  const api = useApi()
  const locale = useLocale()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: [api.client.baseUrl, 'trash'],
    queryFn: () => api.listTrash(),
  })

  const mutation = useMutation({
    mutationFn: ({ action, documents }: { action: 'restore' | 'empty'; documents: number[] }) =>
      api.trashAction(action, documents),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'trash'] })
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'documents'] })
    },
  })

  const documents = data?.results ?? []

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <h1 className="ui-chrome flex-1 text-xl font-bold text-ink">{t('nav.trash')}</h1>
        {documents.length > 0 && (
          <Button
            variant="danger"
            size="sm"
            loading={mutation.isPending}
            onClick={() => {
              if (window.confirm(t('common.confirmDelete')))
                mutation.mutate({ action: 'empty', documents: documents.map((d) => d.id) })
            }}
          >
            <Trash2 className="size-4" />
            {t('trash.empty')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <CenteredSpinner />
      ) : documents.length === 0 ? (
        <EmptyState icon={Trash2} title={t('trash.emptyState')} />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface-1">
          {documents.map((document) => (
            <li key={document.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{document.title}</p>
                <p className="ui-chrome text-xs text-ink-faint">
                  {t('trash.deletedAt')} {formatDate(document.deleted_at, locale, true)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => mutation.mutate({ action: 'restore', documents: [document.id] })}
              >
                <RotateCcw className="size-4" />
                <span className="hidden sm:inline">{t('trash.restore')}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
