import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { useLookups } from '@/hooks/data'
import { Button } from '@/components/ui/Button'
import { Field, Input, NativeSelect } from '@/components/ui/Input'
import { TagPicker } from '@/features/documents/TagPicker'
import { CustomFieldsEditor } from './CustomFieldsEditor'
import type { CustomFieldInstance, PaperlessDocument } from '@/api/types'

interface FormState {
  title: string
  created: string
  correspondent: string
  document_type: string
  storage_path: string
  archive_serial_number: string
  tags: number[]
  custom_fields: CustomFieldInstance[]
}

function toFormState(document: PaperlessDocument): FormState {
  return {
    title: document.title,
    created: document.created?.slice(0, 10) ?? '',
    correspondent: document.correspondent != null ? String(document.correspondent) : '',
    document_type: document.document_type != null ? String(document.document_type) : '',
    storage_path: document.storage_path != null ? String(document.storage_path) : '',
    archive_serial_number: document.archive_serial_number != null ? String(document.archive_serial_number) : '',
    tags: document.tags,
    custom_fields: document.custom_fields,
  }
}

export function MetadataForm({ document }: { document: PaperlessDocument }) {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const { correspondents, documentTypes, storagePaths } = useLookups()
  const [form, setForm] = useState<FormState>(() => toFormState(document))
  const [saved, setSaved] = useState(false)

  useEffect(() => setForm(toFormState(document)), [document])

  const dirty = JSON.stringify(form) !== JSON.stringify(toFormState(document))

  const mutation = useMutation({
    mutationFn: () =>
      api.updateDocument(document.id, {
        title: form.title,
        created: form.created || document.created,
        correspondent: form.correspondent ? Number(form.correspondent) : null,
        document_type: form.document_type ? Number(form.document_type) : null,
        storage_path: form.storage_path ? Number(form.storage_path) : null,
        archive_serial_number: form.archive_serial_number ? Number(form.archive_serial_number) : null,
        tags: form.tags,
        custom_fields: form.custom_fields,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'document', document.id] })
      void queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'documents'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    },
  })

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }))

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      <Field label={t('detail.title')}>
        <Input value={form.title} onChange={(e) => set('title', e.target.value)} required />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('detail.created')}>
          <Input type="date" value={form.created} onChange={(e) => set('created', e.target.value)} />
        </Field>
        <Field label={t('detail.asn')}>
          <Input
            type="number"
            inputMode="numeric"
            value={form.archive_serial_number}
            onChange={(e) => set('archive_serial_number', e.target.value)}
          />
        </Field>
      </div>

      <Field label={t('documents.filter.correspondent')}>
        <NativeSelect value={form.correspondent} onChange={(e) => set('correspondent', e.target.value)}>
          <option value="">{t('common.none')}</option>
          {correspondents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t('documents.filter.documentType')}>
          <NativeSelect value={form.document_type} onChange={(e) => set('document_type', e.target.value)}>
            <option value="">{t('common.none')}</option>
            {documentTypes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label={t('documents.filter.storagePath')}>
          <NativeSelect value={form.storage_path} onChange={(e) => set('storage_path', e.target.value)}>
            <option value="">{t('common.none')}</option>
            {storagePaths.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field label={t('documents.filter.tags')}>
        <TagPicker selected={form.tags} onChange={(tags) => set('tags', tags)} />
      </Field>

      <Field label={t('detail.customFields')}>
        <CustomFieldsEditor value={form.custom_fields} onChange={(custom_fields) => set('custom_fields', custom_fields)} />
      </Field>

      <Button type="submit" className="w-full" disabled={!dirty} loading={mutation.isPending}>
        {saved ? t('detail.saved') : t('detail.saveChanges')}
      </Button>
    </form>
  )
}
