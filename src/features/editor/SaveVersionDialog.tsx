import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useExportCapability } from '@embedpdf/plugin-export/react'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { todayIso } from '@/lib/utils'
import { taskToPromise } from '@/lib/task'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent } from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Input'
import { ErrorBox } from '@/components/ui/misc'
import type { PaperlessDocument } from '@/api/types'

/**
 * Speichern → PDF mit eingebetteten Annotationen exportieren und als neue
 * Dokumentversion hochladen (mit Konfliktprüfung gegen neuere Server-Versionen).
 */
export function SaveVersionDialog({
  docId,
  document,
  onClose,
  onUploaded,
}: {
  docId: string
  document: PaperlessDocument
  onClose: () => void
  onUploaded: () => Promise<void>
}) {
  const t = useT()
  const api = useApi()
  const queryClient = useQueryClient()
  const [label, setLabel] = useState(`Annotiert ${todayIso()}`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { provides: exportCap } = useExportCapability()
  const rootId = document.root_document ?? document.id
  const knownMaxVersion = Math.max(0, ...(document.versions ?? []).map((version) => version.id))

  async function save() {
    if (!exportCap) return
    setBusy(true)
    setError(null)
    try {
      // Konfliktprüfung: gibt es inzwischen eine neuere Version auf dem Server?
      try {
        const fresh = await api.getDocument(rootId)
        const freshMax = Math.max(0, ...(fresh.versions ?? []).map((version) => version.id))
        if (freshMax > knownMaxVersion && !window.confirm(t('editor.conflict'))) {
          setBusy(false)
          return
        }
      } catch {
        // Konfliktprüfung nicht möglich (z. B. offline) → Upload versucht es ohnehin
      }

      const arrayBuffer = await taskToPromise(exportCap.forDocument(docId).saveAsCopy())
      const blob = new Blob([arrayBuffer], { type: 'application/pdf' })
      const filename = (document.original_file_name ?? `${document.title}.pdf`).replace(/\.pdf$/i, '') + '.pdf'
      await api.uploadVersion(rootId, blob, filename, label || undefined)

      await queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'document', rootId] })
      await queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'documents'] })
      queryClient.removeQueries({ queryKey: [api.client.baseUrl, 'original-buffer', rootId] })
      queryClient.removeQueries({ queryKey: [api.client.baseUrl, 'preview', rootId] })
      await onUploaded()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : String(uploadError))
      setBusy(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <DialogContent title={t('editor.saveTitle')} description={document.title}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <Field label={t('editor.versionLabel')}>
            <Input value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
          </Field>
          {error && <ErrorBox>{error}</ErrorBox>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1" loading={busy}>
              {busy ? t('editor.uploading') : t('editor.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
