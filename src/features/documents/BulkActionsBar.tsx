import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Tag as TagIcon, Trash2, User, FileType } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { Button } from '@/components/ui/Button'
import { NativeSelect } from '@/components/ui/Input'
import { useT } from '@/lib/i18n'
import { useApi } from '@/stores/session'
import { useLookups } from '@/hooks/data'
import { TagPicker } from './TagPicker'

/** Bulk-Aktionen für die Mehrfachauswahl in der Dokumentenliste. */
export function BulkActionsBar({ selectedIds, onDone }: { selectedIds: number[]; onDone: () => void }) {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const { correspondents, documentTypes } = useLookups()
  const [addTags, setAddTags] = useState<number[]>([])

  const mutation = useMutation({
    mutationFn: ({ method, parameters }: { method: string; parameters?: Record<string, unknown> }) =>
      api.bulkEdit(selectedIds, method, parameters),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'documents'] })
      onDone()
    },
  })

  return (
    <div className="ui-chrome fixed inset-x-0 bottom-16 z-40 mx-auto flex w-fit max-w-[95vw] items-center gap-2 rounded-2xl border border-line bg-surface-1 p-2 shadow-xl sm:bottom-4 animate-fade-in">
      <span className="px-2 text-sm font-medium text-ink">{t('documents.selected', { n: selectedIds.length })}</span>

      {/* Tags hinzufügen */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button variant="outline" size="sm">
            <TagIcon className="size-4" />
            {t('documents.filter.tags')}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="top" sideOffset={8} className="z-50 w-72 space-y-2 rounded-xl border border-line bg-surface-1 p-3 shadow-xl">
            <TagPicker selected={addTags} onChange={setAddTags} />
            <Button
              size="sm"
              className="w-full"
              disabled={addTags.length === 0}
              loading={mutation.isPending}
              onClick={() => mutation.mutate({ method: 'modify_tags', parameters: { add_tags: addTags, remove_tags: [] } })}
            >
              {t('common.save')}
            </Button>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Korrespondent setzen */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <User className="size-4" />
            {t('documents.filter.correspondent')}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="top" sideOffset={8} className="z-50 w-64 rounded-xl border border-line bg-surface-1 p-3 shadow-xl">
            <NativeSelect
              onChange={(e) =>
                mutation.mutate({ method: 'set_correspondent', parameters: { correspondent: e.target.value ? Number(e.target.value) : null } })
              }
              defaultValue=""
            >
              <option value="">{t('common.none')}</option>
              {correspondents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {/* Dokumenttyp setzen */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <FileType className="size-4" />
            {t('documents.filter.documentType')}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="top" sideOffset={8} className="z-50 w-64 rounded-xl border border-line bg-surface-1 p-3 shadow-xl">
            <NativeSelect
              onChange={(e) =>
                mutation.mutate({ method: 'set_document_type', parameters: { document_type: e.target.value ? Number(e.target.value) : null } })
              }
              defaultValue=""
            >
              <option value="">{t('common.none')}</option>
              {documentTypes.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      <Button
        variant="danger"
        size="sm"
        loading={mutation.isPending}
        onClick={() => {
          if (window.confirm(t('common.confirmDelete'))) mutation.mutate({ method: 'delete' })
        }}
      >
        <Trash2 className="size-4" />
        {t('common.delete')}
      </Button>
    </div>
  )
}
