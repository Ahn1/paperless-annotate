import { Plus, X } from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useCustomFields } from '@/hooks/data'
import { useT } from '@/lib/i18n'
import { Input, NativeSelect } from '@/components/ui/Input'
import { Switch } from '@/components/ui/Switch'
import type { CustomField, CustomFieldInstance } from '@/api/types'

/** Editor für alle Custom-Field-Typen (string, url, date, bool, int, float, monetary, select, doclink). */
export function CustomFieldsEditor({
  value,
  onChange,
}: {
  value: CustomFieldInstance[]
  onChange: (value: CustomFieldInstance[]) => void
}) {
  const t = useT()
  const { data: fields = [] } = useCustomFields()
  const fieldById = new Map(fields.map((f) => [f.id, f]))
  const unused = fields.filter((f) => !value.some((instance) => instance.field === f.id))

  function setValue(fieldId: number, fieldValue: unknown) {
    onChange(value.map((instance) => (instance.field === fieldId ? { ...instance, value: fieldValue } : instance)))
  }

  return (
    <div className="space-y-2">
      {value.map((instance) => {
        const field = fieldById.get(instance.field)
        if (!field) return null
        return (
          <div key={instance.field} className="flex items-center gap-2">
            <span className="ui-chrome w-28 shrink-0 truncate text-xs font-medium text-ink-muted" title={field.name}>
              {field.name}
            </span>
            <div className="min-w-0 flex-1">
              <FieldInput field={field} value={instance.value} onChange={(v) => setValue(field.id, v)} />
            </div>
            <button
              type="button"
              onClick={() => onChange(value.filter((other) => other.field !== instance.field))}
              className="ui-chrome shrink-0 rounded-lg p-1.5 text-ink-faint hover:bg-surface-2 hover:text-danger"
              aria-label={t('common.delete')}
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}

      {unused.length > 0 && (
        <Popover.Root>
          <Popover.Trigger asChild>
            <button type="button" className="ui-chrome flex items-center gap-1.5 text-sm font-medium text-accent hover:opacity-80">
              <Plus className="size-4" />
              {t('detail.addCustomField')}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content align="start" sideOffset={6} className="z-40 w-56 rounded-xl border border-line bg-surface-1 p-1.5 shadow-xl">
              {unused.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => onChange([...value, { field: field.id, value: null }])}
                  className="ui-chrome block w-full rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-surface-2"
                >
                  {field.name}
                  <span className="ml-2 text-xs text-ink-faint">{field.data_type}</span>
                </button>
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  )
}

function FieldInput({ field, value, onChange }: { field: CustomField; value: unknown; onChange: (value: unknown) => void }) {
  switch (field.data_type) {
    case 'boolean':
      return <Switch checked={value === true} onCheckedChange={onChange} />
    case 'date':
      return <Input type="date" className="h-9" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />
    case 'integer':
      return (
        <Input
          type="number"
          step="1"
          className="h-9"
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
        />
      )
    case 'float':
    case 'monetary':
      return (
        <Input
          type={field.data_type === 'monetary' ? 'text' : 'number'}
          inputMode="decimal"
          className="h-9"
          placeholder={field.data_type === 'monetary' ? 'EUR123.45' : undefined}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : field.data_type === 'monetary' ? e.target.value : Number(e.target.value))}
        />
      )
    case 'select':
      return (
        <NativeSelect className="h-9" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)}>
          <option value="" />
          {(field.extra_data?.select_options ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      )
    case 'documentlink':
      return (
        <Input
          className="h-9"
          placeholder="1, 2, 3"
          value={Array.isArray(value) ? value.join(', ') : ''}
          onChange={(e) =>
            onChange(
              e.target.value
                .split(',')
                .map((part) => parseInt(part.trim(), 10))
                .filter(Number.isFinite),
            )
          }
        />
      )
    case 'url':
      return <Input type="url" className="h-9" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />
    default:
      return <Input className="h-9" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value || null)} />
  }
}
