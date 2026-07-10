import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileWarning } from 'lucide-react'
import { useApi } from '@/stores/session'
import { useT } from '@/lib/i18n'
import { CenteredSpinner, EmptyState } from '@/components/ui/misc'

/** PDF-Vorschau: lädt /preview/ als Blob (Auth-Header) und zeigt es im iframe. */
export function PreviewPane({ documentId, versionId, className }: { documentId: number; versionId?: number; className?: string }) {
  const t = useT()
  const api = useApi()
  const { data: blob, isError } = useQuery({
    queryKey: [api.client.baseUrl, 'preview', documentId, versionId ?? null],
    queryFn: ({ signal }) => api.getPreviewBlob(documentId, versionId, signal),
    staleTime: 10 * 60 * 1000,
  })

  // Object-URL im selben Effect erzeugen und revoken (wie AuthImage): useMemo + Cleanup-Revoke
  // hinterlässt bei einem Doppel-Mount eine tote URL → leerer iframe.
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [blob])

  if (isError) {
    return (
      <div className={className}>
        <EmptyState icon={FileWarning} title={t('editor.loadError')} />
      </div>
    )
  }
  if (!url) {
    return (
      <div className={className}>
        <CenteredSpinner />
      </div>
    )
  }
  return <iframe src={url} title="PDF preview" className={className} />
}
