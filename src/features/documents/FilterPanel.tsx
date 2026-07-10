import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Filter, Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input, NativeSelect } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { useT } from '@/lib/i18n'
import { useLookups } from '@/hooks/data'
import { useApi } from '@/stores/session'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DocumentFilters, DocumentOrdering } from '@/api/types'
import { filtersToSavedViewRules } from './documentQuery'
import { TagPicker } from './TagPicker'

export function FilterPanel({
  filters,
  ordering,
  onChange,
  activeCount,
}: {
  filters: DocumentFilters
  ordering: DocumentOrdering
  onChange: (filters: DocumentFilters) => void
  activeCount: number
}) {
  const t = useT()
  const { correspondents, documentTypes, storagePaths } = useLookups()
  const [saveOpen, setSaveOpen] = useState(false)

  const idOrNone = (value: string): number | 'none' | undefined =>
    value === '' ? undefined : value === 'none' ? 'none' : Number(value)

  return (
    <>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button variant="outline" size="md" className="relative shrink-0">
            <Filter className="size-4" />
            <span className="hidden md:inline">{t('documents.filter')}</span>
            {activeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-fg">
                {activeCount}
              </span>
            )}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            align="end"
            sideOffset={8}
            className="z-40 w-[min(92vw,22rem)] space-y-3 rounded-2xl border border-line bg-surface-1 p-4 shadow-xl animate-fade-in"
          >
            <Field label={t('documents.filter.tags')}>
              <TagPicker selected={filters.tags ?? []} onChange={(tags) => onChange({ ...filters, tags: tags.length ? tags : undefined })} />
            </Field>
            <Field label={t('documents.filter.correspondent')}>
              <NativeSelect
                value={filters.correspondent != null ? String(filters.correspondent) : ''}
                onChange={(e) => onChange({ ...filters, correspondent: idOrNone(e.target.value) })}
              >
                <option value="">{t('common.all')}</option>
                <option value="none">{t('common.none')}</option>
                {correspondents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={t('documents.filter.documentType')}>
              <NativeSelect
                value={filters.documentType != null ? String(filters.documentType) : ''}
                onChange={(e) => onChange({ ...filters, documentType: idOrNone(e.target.value) })}
              >
                <option value="">{t('common.all')}</option>
                <option value="none">{t('common.none')}</option>
                {documentTypes.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={t('documents.filter.storagePath')}>
              <NativeSelect
                value={filters.storagePath != null ? String(filters.storagePath) : ''}
                onChange={(e) => onChange({ ...filters, storagePath: idOrNone(e.target.value) })}
              >
                <option value="">{t('common.all')}</option>
                <option value="none">{t('common.none')}</option>
                {storagePaths.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label={t('documents.filter.dateFrom')}>
                <Input type="date" value={filters.createdFrom ?? ''} onChange={(e) => onChange({ ...filters, createdFrom: e.target.value || undefined })} />
              </Field>
              <Field label={t('documents.filter.dateTo')}>
                <Input type="date" value={filters.createdTo ?? ''} onChange={(e) => onChange({ ...filters, createdTo: e.target.value || undefined })} />
              </Field>
            </div>
            <div className="ui-chrome flex items-center justify-between">
              <span className="text-sm font-medium text-ink">{t('documents.filter.inbox')}</span>
              <Switch checked={!!filters.inbox} onCheckedChange={(inbox) => onChange({ ...filters, inbox: inbox || undefined })} />
            </div>
            <div className="flex gap-2 border-t border-line pt-3">
              <Button variant="ghost" size="sm" onClick={() => onChange({ query: filters.query })}>
                {t('documents.filter.clear')}
              </Button>
              <Button variant="outline" size="sm" className="ml-auto" onClick={() => setSaveOpen(true)} disabled={activeCount === 0 && !filters.query}>
                <Save className="size-3.5" />
                {t('documents.filter.saveView')}
              </Button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <SaveViewDialog open={saveOpen} onOpenChange={setSaveOpen} filters={filters} ordering={ordering} />
    </>
  )
}

function SaveViewDialog({
  open,
  onOpenChange,
  filters,
  ordering,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  filters: DocumentFilters
  ordering: DocumentOrdering
}) {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [onDashboard, setOnDashboard] = useState(false)
  const [inSidebar, setInSidebar] = useState(true)

  const mutation = useMutation({
    mutationFn: () =>
      api.createSavedView({
        name,
        show_on_dashboard: onDashboard,
        show_in_sidebar: inSidebar,
        sort_field: ordering.replace(/^-/, ''),
        sort_reverse: ordering.startsWith('-'),
        filter_rules: filtersToSavedViewRules(filters),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'saved_views'] })
      onOpenChange(false)
      setName('')
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t('documents.filter.saveView')}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate()
          }}
        >
          <Field label={t('onboarding.profileName')}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
          <div className="ui-chrome flex items-center justify-between">
            <span className="text-sm text-ink">Dashboard</span>
            <Switch checked={onDashboard} onCheckedChange={setOnDashboard} />
          </div>
          <div className="ui-chrome flex items-center justify-between">
            <span className="text-sm text-ink">Sidebar</span>
            <Switch checked={inSidebar} onCheckedChange={setInSidebar} />
          </div>
          <Button type="submit" className="w-full" loading={mutation.isPending}>
            {t('common.save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
