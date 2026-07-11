import { lazy, Suspense } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileWarning } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { CenteredSpinner, EmptyState } from '@/components/ui/misc'

// PDF-Engine (WASM) erst laden, wenn eine Vorschau wirklich gebraucht wird
const PdfPreview = lazy(() => import('./PdfPreview'))

/**
 * PDF-Vorschau auf EmbedPDF-Basis (FitWidth + Pinch-Zoom, Ctrl+Mausrad am Desktop).
 * Bewusst kein iframe: auf iOS/Android rendern iframes PDFs nicht brauchbar
 * (nur erste Seite, kein Zoom), und so ist das Rendering überall identisch.
 */
export function PreviewPane({ documentId, versionId, className }: { documentId: number; versionId?: number; className?: string }) {
  const t = useT()
  const api = useApi()
  // Wie ReaderPage: Buffer nicht im Query-Cache halten (WASM-Engine konsumiert ihn)
  const { data: buffer, isError } = useQuery({
    queryKey: [api.client.baseUrl, 'preview-buffer', documentId, versionId ?? null],
    queryFn: async ({ signal }) => {
      const blob = await api.getPreviewBlob(documentId, versionId, signal)
      return blob.arrayBuffer()
    },
    staleTime: Infinity,
    gcTime: 0,
  })

  if (isError) {
    return (
      <div className={className}>
        <EmptyState icon={FileWarning} title={t('editor.loadError')} />
      </div>
    )
  }
  if (!buffer) {
    return (
      <div className={className}>
        <CenteredSpinner />
      </div>
    )
  }
  return (
    <Suspense
      fallback={
        <div className={className}>
          <CenteredSpinner />
        </div>
      }
    >
      <PdfPreview
        buffer={buffer}
        name={`document-${documentId}.pdf`}
        docKey={`preview-${documentId}-${versionId ?? 'current'}`}
        className={className}
      />
    </Suspense>
  )
}
