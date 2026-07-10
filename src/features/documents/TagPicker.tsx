import { useMemo, useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ChevronDown, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTags } from '@/hooks/data'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { TagChip } from '@/components/ui/misc'
import { cn } from '@/lib/utils'

/** Tag-Mehrfachauswahl mit Suche und Inline-Neuanlage. */
export function TagPicker({
  selected,
  onChange,
  allowCreate = true,
}: {
  selected: number[]
  onChange: (tags: number[]) => void
  allowCreate?: boolean
}) {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const { data: tags = [] } = useTags()
  const [search, setSearch] = useState('')

  const selectedTags = useMemo(() => tags.filter((tag) => selected.includes(tag.id)), [tags, selected])
  const filtered = useMemo(
    () => tags.filter((tag) => tag.name.toLowerCase().includes(search.toLowerCase())),
    [tags, search],
  )
  const exactMatch = tags.some((tag) => tag.name.toLowerCase() === search.trim().toLowerCase())

  const createMutation = useMutation({
    mutationFn: (name: string) => api.createTag({ name, color: '#a6cee3' }),
    onSuccess: (tag) => {
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'tags'] })
      onChange([...selected, tag.id])
      setSearch('')
    },
  })

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id])
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface-1 px-3 py-2 text-left text-sm hover:border-accent"
        >
          {selectedTags.length === 0 && <span className="text-ink-faint">{t('common.none')}</span>}
          {selectedTags.map((tag) => (
            <TagChip key={tag.id} tag={tag} small />
          ))}
          <ChevronDown className="ml-auto size-4 shrink-0 text-ink-faint" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 w-[min(92vw,20rem)] rounded-xl border border-line bg-surface-1 p-2 shadow-xl animate-fade-in"
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('common.search')}
            className="mb-2 h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          />
          <ul className="max-h-56 space-y-0.5 overflow-y-auto">
            {filtered.map((tag) => (
              <li key={tag.id}>
                <button
                  type="button"
                  onClick={() => toggle(tag.id)}
                  className={cn(
                    'ui-chrome flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2',
                    selected.includes(tag.id) && 'bg-accent-soft',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded border text-[10px] text-white',
                      selected.includes(tag.id) ? 'border-accent bg-accent' : 'border-line',
                    )}
                  >
                    {selected.includes(tag.id) && '✓'}
                  </span>
                  <TagChip tag={tag} small />
                  {tag.document_count != null && <span className="ml-auto text-xs text-ink-faint">{tag.document_count}</span>}
                </button>
              </li>
            ))}
            {allowCreate && search.trim() && !exactMatch && (
              <li>
                <button
                  type="button"
                  onClick={() => createMutation.mutate(search.trim())}
                  disabled={createMutation.isPending}
                  className="ui-chrome flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-accent hover:bg-surface-2"
                >
                  <Plus className="size-4" />
                  „{search.trim()}“ {t('common.create').toLowerCase()}
                </button>
              </li>
            )}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
