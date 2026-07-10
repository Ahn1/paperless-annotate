import { lazy, Suspense } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileWarning } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { CenteredSpinner, EmptyState } from '@/components/ui/misc'
import { Button } from '@/components/ui/Button'

// Wie der Editor: PDF-Engine (WASM) erst laden, wenn der Lesemodus geöffnet wird
const PdfReader = lazy(() => import('./PdfReader'))

/** Lesemodus: PDF im Vollbild (Route /documents/:id/read, optional ?version=). */
export function ReaderPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const t = useT()
  const api = useApi()

  const documentId = Number(id)
  const versionParam = searchParams.get('version')
  const versionId = versionParam ? Number(versionParam) : undefined

  const documentQuery = useQuery({
    queryKey: [api.client.baseUrl, 'document', documentId],
    queryFn: () => api.getDocument(documentId),
    enabled: Number.isFinite(documentId),
  })

  const bufferQuery = useQuery({
    queryKey: [api.client.baseUrl, 'original-buffer', documentId, versionId ?? null],
    queryFn: async ({ signal }) => {
      const blob = await api.downloadOriginal(documentId, versionId, signal)
      return blob.arrayBuffer()
    },
    enabled: Number.isFinite(documentId),
    staleTime: Infinity,
    gcTime: 0,
  })

  if (documentQuery.isLoading || bufferQuery.isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <CenteredSpinner />
      </div>
    )
  }

  if (!documentQuery.data || !bufferQuery.data) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-surface">
        <EmptyState icon={FileWarning} title={t('editor.loadError')} />
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t('common.back')}
        </Button>
      </div>
    )
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-surface">
          <CenteredSpinner />
        </div>
      }
    >
      <PdfReader document={documentQuery.data} versionId={versionId} buffer={bufferQuery.data} />
    </Suspense>
  )
}
