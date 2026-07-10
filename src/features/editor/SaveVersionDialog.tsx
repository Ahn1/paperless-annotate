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
import { ErrorBox, InfoBox } from '@/components/ui/misc'
import type { PaperlessDocument } from '@/api/types'

/**
 * Speichern → PDF mit eingebetteten Annotationen exportieren und hochladen.
 * - Paperless v3: als neue Dokumentversion (mit Konfliktprüfung gegen neuere Server-Versionen).
 * - Paperless v2 (kein `versions`-Feld im Serializer): Fallback als NEUES Dokument
 *   via post_document – das Original bleibt unverändert.
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

  // v3-Server liefern am Dokument immer ein versions-Array; fehlt es, ist es ein v2-Server
  const supportsVersions = Array.isArray(document.versions)

  const [label, setLabel] = useState(`Annotiert ${todayIso()}`)
  const [newTitle, setNewTitle] = useState(`${document.title} (annotiert ${todayIso()})`)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { provides: exportCap } = useExportCapability()
  const rootId = document.root_document ?? document.id
  const knownMaxVersion = Math.max(0, ...(document.versions ?? []).map((version) => version.id))

  async function exportPdf(): Promise<Blob> {
    if (!exportCap) throw new Error('Export not ready')
    const arrayBuffer = await taskToPromise(exportCap.forDocument(docId).saveAsCopy())
    return new Blob([arrayBuffer], { type: 'application/pdf' })
  }

  function baseFilename(): string {
    return (document.original_file_name ?? `${document.title}.pdf`).replace(/\.pdf$/i, '')
  }

  async function saveAsVersion() {
    // Konfliktprüfung: gibt es inzwischen eine neuere Version auf dem Server?
    try {
      const fresh = await api.getDocument(rootId)
      const freshMax = Math.max(0, ...(fresh.versions ?? []).map((version) => version.id))
      if (freshMax > knownMaxVersion && !window.confirm(t('editor.conflict'))) return false
    } catch {
      // Konfliktprüfung nicht möglich (z. B. offline) → Upload versucht es ohnehin
    }
    const blob = await exportPdf()
    await api.uploadVersion(rootId, blob, `${baseFilename()}.pdf`, label || undefined)
    await queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'document', rootId] })
    await queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'documents'] })
    queryClient.removeQueries({ queryKey: [api.client.baseUrl, 'original-buffer', rootId] })
    queryClient.removeQueries({ queryKey: [api.client.baseUrl, 'preview', rootId] })
    return true
  }

  async function saveAsNewDocument() {
    const blob = await exportPdf()
    const file = new File([blob], `${baseFilename()} (annotiert).pdf`, { type: 'application/pdf' })
    // Metadaten des Originals mitgeben, damit die Kopie gleich einsortiert ist
    await api.uploadDocument({
      file,
      title: newTitle || undefined,
      tags: document.tags.length ? document.tags : undefined,
      correspondent: document.correspondent ?? undefined,
      documentType: document.document_type ?? undefined,
    })
    await queryClient.invalidateQueries({ queryKey: [api.client.baseUrl, 'documents'] })
    window.alert(t('editor.uploadedAsNew'))
    return true
  }

  async function save() {
    setBusy(true)
    setError(null)
    try {
      const done = supportsVersions ? await saveAsVersion() : await saveAsNewDocument()
      if (done) await onUploaded()
      else setBusy(false)
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
          {supportsVersions ? (
            <Field label={t('editor.versionLabel')}>
              <Input value={label} onChange={(event) => setLabel(event.target.value)} autoFocus />
            </Field>
          ) : (
            <>
              <InfoBox>{t('editor.noVersionsHint')}</InfoBox>
              <Field label={t('editor.newDocumentTitle')}>
                <Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} autoFocus required />
              </Field>
            </>
          )}
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
