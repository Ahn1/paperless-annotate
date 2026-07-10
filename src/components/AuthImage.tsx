import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useApi } from '@/stores/session'
import { cn } from '@/lib/utils'
import { FileText } from 'lucide-react'

/**
 * Thumbnails/Previews brauchen den Authorization-Header, den <img src> nicht senden kann.
 * Lädt das Bild daher als Blob (mit Query-Cache) und zeigt eine Object-URL an.
 */
export function AuthImage({
  documentId,
  versionId,
  kind = 'thumb',
  alt,
  className,
}: {
  documentId: number
  versionId?: number
  kind?: 'thumb' | 'preview'
  alt: string
  className?: string
}) {
  const api = useApi()
  const { data: blob, isError } = useQuery({
    queryKey: ['blob', api.client.baseUrl, kind, documentId, versionId ?? null],
    queryFn: ({ signal }) =>
      kind === 'thumb' ? api.getThumbBlob(documentId, versionId, signal) : api.getPreviewBlob(documentId, versionId, signal),
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })

  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])
  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [url])

  if (isError || (!url && blob !== undefined)) {
    return (
      <div className={cn('flex items-center justify-center bg-surface-2 text-ink-faint', className)}>
        <FileText className="size-8" />
      </div>
    )
  }
  if (!url) return <div className={cn('animate-skeleton bg-surface-3', className)} />
  return <img src={url} alt={alt} loading="lazy" draggable={false} className={cn('object-cover', className)} />
}
