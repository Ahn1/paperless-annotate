import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { useCustomFields } from '@/hooks/data'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Field, Input, NativeSelect } from '@/components/ui/Input'
import { CenteredSpinner, EmptyState, Badge } from '@/components/ui/misc'
import type { CustomField, CustomFieldDataType } from '@/api/types'

const dataTypes: CustomFieldDataType[] = [
  'string',
  'url',
  'date',
  'boolean',
  'integer',
  'float',
  'monetary',
  'documentlink',
  'select',
]

export function CustomFieldsPage() {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const { data: fields, isLoading } = useCustomFields()
  const [editing, setEditing] = useState<CustomField | 'new' | null>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'custom_fields'] })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCustomField(id),
    onSuccess: invalidate,
  })

  if (isLoading) return <CenteredSpinner />

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus className="size-4" />
          {t('common.create')}
        </Button>
      </div>

      {(fields ?? []).length === 0 ? (
        <EmptyState icon={SlidersHorizontal} title={t('common.empty')} />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-line bg-surface-1">
          {(fields ?? []).map((field) => (
            <li key={field.id} className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{field.name}</p>
              </div>
              <Badge>{field.data_type}</Badge>
              {field.document_count != null && (
                <span className="ui-chrome text-xs text-ink-muted">
                  {field.document_count} {t('manage.documents')}
                </span>
              )}
              <Button variant="ghost" size="sm" onClick={() => setEditing(field)} aria-label={t('common.edit')}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm(`${t('common.confirmDelete')} (${field.name})`)) deleteMutation.mutate(field.id)
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
        <CustomFieldDialog
          field={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (data) => {
            if (editing === 'new') await api.createCustomField(data)
            else await api.updateCustomField(editing.id, data)
            await invalidate()
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}

function CustomFieldDialog({
  field,
  onClose,
  onSave,
}: {
  field: CustomField | null
  onClose: () => void
  onSave: (data: Partial<CustomField>) => Promise<void>
}) {
  const t = useT()
  const [name, setName] = useState(field?.name ?? '')
  const [dataType, setDataType] = useState<CustomFieldDataType>(field?.data_type ?? 'string')
  const [options, setOptions] = useState<{ id: string; label: string }[]>(field?.extra_data?.select_options ?? [])
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    try {
      const data: Partial<CustomField> = { name }
      if (!field) data.data_type = dataType // Datentyp ist nach Anlage unveränderlich
      if (dataType === 'select') {
        data.extra_data = { select_options: options.filter((option) => option.label.trim()) }
      }
      await onSave(data)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={field ? t('common.edit') : t('common.create')}>
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
          <Field label={t('manage.dataType')}>
            <NativeSelect value={dataType} onChange={(e) => setDataType(e.target.value as CustomFieldDataType)} disabled={!!field}>
              {dataTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </NativeSelect>
          </Field>

          {dataType === 'select' && (
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={option.id || index} className="flex gap-2">
                  <Input
                    value={option.label}
                    onChange={(e) =>
                      setOptions(options.map((other, i) => (i === index ? { ...other, label: e.target.value } : other)))
                    }
                    className="h-9 flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setOptions(options.filter((_, i) => i !== index))}
                    aria-label={t('common.delete')}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setOptions([...options, { id: '', label: '' }])}>
                <Plus className="size-4" />
              </Button>
            </div>
          )}

          <Button type="submit" className="w-full" loading={busy}>
            {t('common.save')}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
