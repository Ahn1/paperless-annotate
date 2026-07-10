import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT, type TranslationKey } from '@/lib/i18n'
import { useCorrespondents, useDocumentTypes, useStoragePaths, useTags } from '@/hooks/data'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Field, Input, NativeSelect } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { CenteredSpinner, EmptyState, TagChip } from '@/components/ui/misc'
import type { Correspondent, DocumentType, StoragePath, Tag } from '@/api/types'
import type { PaperlessApi } from '@/api/paperless'

export type CrudKind = 'tags' | 'correspondents' | 'documentTypes' | 'storagePaths'

interface Item {
  id: number
  name: string
  document_count?: number
  matching_algorithm: number
  match: string
  is_insensitive: boolean
}

const matchingOptions: { value: number; key: TranslationKey }[] = [
  { value: 0, key: 'manage.match.none' },
  { value: 1, key: 'manage.match.any' },
  { value: 2, key: 'manage.match.all' },
  { value: 3, key: 'manage.match.literal' },
  { value: 4, key: 'manage.match.regex' },
  { value: 5, key: 'manage.match.fuzzy' },
  { value: 6, key: 'manage.match.auto' },
]

function useKindConfig(kind: CrudKind) {
  const tags = useTags()
  const correspondents = useCorrespondents()
  const documentTypes = useDocumentTypes()
  const storagePaths = useStoragePaths()
  switch (kind) {
    case 'tags':
      return {
        query: tags,
        cacheKey: 'tags',
        create: (api: PaperlessApi, data: Partial<Tag>) => api.createTag(data),
        update: (api: PaperlessApi, id: number, data: Partial<Tag>) => api.updateTag(id, data),
        remove: (api: PaperlessApi, id: number) => api.deleteTag(id),
      }
    case 'correspondents':
      return {
        query: correspondents,
        cacheKey: 'correspondents',
        create: (api: PaperlessApi, data: Partial<Correspondent>) => api.createCorrespondent(data),
        update: (api: PaperlessApi, id: number, data: Partial<Correspondent>) => api.updateCorrespondent(id, data),
        remove: (api: PaperlessApi, id: number) => api.deleteCorrespondent(id),
      }
    case 'documentTypes':
      return {
        query: documentTypes,
        cacheKey: 'document_types',
        create: (api: PaperlessApi, data: Partial<DocumentType>) => api.createDocumentType(data),
        update: (api: PaperlessApi, id: number, data: Partial<DocumentType>) => api.updateDocumentType(id, data),
        remove: (api: PaperlessApi, id: number) => api.deleteDocumentType(id),
      }
    case 'storagePaths':
      return {
        query: storagePaths,
        cacheKey: 'storage_paths',
        create: (api: PaperlessApi, data: Partial<StoragePath>) => api.createStoragePath(data),
        update: (api: PaperlessApi, id: number, data: Partial<StoragePath>) => api.updateStoragePath(id, data),
        remove: (api: PaperlessApi, id: number) => api.deleteStoragePath(id),
      }
  }
}

export function CrudPage({ kind }: { kind: CrudKind }) {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const config = useKindConfig(kind)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Item | 'new' | null>(null)

  const items = useMemo(() => {
    const list = (config.query.data ?? []) as Item[]
    return list.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
  }, [config.query.data, search])

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, config.cacheKey] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => config.remove(api, id) as Promise<void>,
    onSuccess: invalidate,
  })

  if (config.query.isLoading) return <CenteredSpinner />

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder={t('common.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          {t('common.create')}
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Tags} title={t('common.empty')} />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface-1">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                {kind === 'tags' ? (
                  <TagChip tag={item as Tag} />
                ) : (
                  <p className="truncate text-sm font-medium text-ink">{item.name}</p>
                )}
                {kind === 'storagePaths' && (
                  <p className="truncate font-mono text-xs text-ink-faint">{(item as StoragePath).path}</p>
                )}
              </div>
              {item.document_count != null && (
                <Link
                  to={`/documents?${kind === 'tags' ? `tags=${item.id}` : kind === 'correspondents' ? `corr=${item.id}` : kind === 'documentTypes' ? `type=${item.id}` : `path=${item.id}`}`}
                  className="ui-chrome shrink-0 text-xs text-ink-muted hover:text-accent"
                >
                  {item.document_count} {t('manage.documents')}
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditing(item)} aria-label={t('common.edit')}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(`${t('common.confirmDelete')} (${item.name})`)) deleteMutation.mutate(item.id)
                }}
                aria-label={t('common.delete')}
              >
                <Trash2 className="size-4 text-danger" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <EditDialog
          kind={kind}
          item={editing === 'new' ? null : editing}
          allTags={kind === 'tags' ? ((config.query.data ?? []) as Tag[]) : []}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing === 'new') await config.create(api, data as never)
            else await config.update(api, editing.id, data as never)
            await invalidate()
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function EditDialog({
  kind,
  item,
  allTags,
  onClose,
  onSave,
}: {
  kind: CrudKind
  item: Item | null
  allTags: Tag[]
  onClose: () => void
  onSave: (data: Record<string, unknown>) => Promise<void>
}) {
  const t = useT()
  const tag = item as Tag | null
  const [name, setName] = useState(item?.name ?? '')
  const [color, setColor] = useState(tag?.color ?? '#a6cee3')
  const [parent, setParent] = useState(tag?.parent != null ? String(tag.parent) : '')
  const [isInbox, setIsInbox] = useState(tag?.is_inbox_tag ?? false)
  const [path, setPath] = useState(item && kind === 'storagePaths' ? (item as StoragePath).path : '')
  const [algorithm, setAlgorithm] = useState(item?.matching_algorithm ?? 6)
  const [match, setMatch] = useState(item?.match ?? '')
  const [insensitive, setInsensitive] = useState(item?.is_insensitive ?? true)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const data: Record<string, unknown> = {
        name,
        matching_algorithm: algorithm,
        match: algorithm === 0 || algorithm === 6 ? '' : match,
        is_insensitive: insensitive,
      }
      if (kind === 'tags') {
        data.color = color
        data.is_inbox_tag = isInbox
        data.parent = parent ? Number(parent) : null
      }
      if (kind === 'storagePaths') data.path = path
      await onSave(data)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={item ? t('common.edit') : t('common.create')}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <Field label={t('manage.name')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>

          {kind === 'tags' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('manage.color')}>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-11 w-full cursor-pointer rounded-xl border border-line bg-surface-1 p-1"
                  />
                </Field>
                <Field label={t('manage.parent')}>
                  <NativeSelect value={parent} onChange={(e) => setParent(e.target.value)}>
                    <option value="">{t('common.none')}</option>
                    {allTags
                      .filter((candidate) => candidate.id !== item?.id)
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.name}
                        </option>
                      ))}
                  </NativeSelect>
                </Field>
              </div>
              <div className="ui-chrome flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{t('manage.inboxTag')}</span>
                <Switch checked={isInbox} onCheckedChange={setIsInbox} />
              </div>
            </>
          )}

          {kind === 'storagePaths' && (
            <Field label={t('manage.path')} hint="{{ created_year }}/{{ correspondent }}/{{ title }}">
              <Input value={path} onChange={(e) => setPath(e.target.value)} required className="font-mono" />
            </Field>
          )}

          <fieldset className="space-y-3 rounded-xl border border-line p-3">
            <legend className="ui-chrome px-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              {t('manage.matching')}
            </legend>
            <Field label={t('manage.matchingAlgorithm')}>
              <NativeSelect value={algorithm} onChange={(e) => setAlgorithm(Number(e.target.value))}>
                {matchingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.key)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            {algorithm !== 0 && algorithm !== 6 && (
              <>
                <Field label={t('manage.matchingPattern')}>
                  <Input value={match} onChange={(e) => setMatch(e.target.value)} />
                </Field>
                <div className="ui-chrome flex items-center justify-between">
                  <span className="text-sm text-ink">{t('manage.insensitive')}</span>
                  <Switch checked={insensitive} onCheckedChange={setInsensitive} />
                </div>
              </>
            )}
          </fieldset>

          <Button type="submit" className="w-full" loading={busy}>
            {t('common.save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
