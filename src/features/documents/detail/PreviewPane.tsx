import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/stores/session'
import { CenteredSpinner } from '@/components/ui/misc'

/** PDF-Vorschau: lädt /preview/ als Blob (Auth-Header) und zeigt es im iframe. */
export function PreviewPane({ documentId, versionId, className }: { documentId: number; versionId?: number; className?: string }) {
  const api = useApi()
  const { data: blob, isLoading } = useQuery({
    queryKey: [api.client.baseUrl, 'preview', documentId, versionId ?? null],
    queryFn: ({ signal }) => api.getPreviewBlob(documentId, versionId, signal),
    staleTime: 10 * 60 * 1000,
  })

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  if (isLoading || !url) {
    return (
      <div className={className}>
        <CenteredSpinner />
      </div>
    )
  }
  return <iframe src={url} title="PDF preview" className={className} />
}
