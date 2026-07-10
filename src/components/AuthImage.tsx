import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
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

  // Object-URL im selben Effect erzeugen und revoken: useMemo + Cleanup-Revoke
  // hinterlässt bei StrictMode-Doppel-Mount (Blob synchron aus dem Cache) eine tote URL.
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
      <div className={cn('flex items-center justify-center bg-surface-2 text-ink-faint', className)}>
        <FileText className="size-8" />
      </div>
    )
  }
  if (!url) return <div className={cn('animate-skeleton bg-surface-3', className)} />
  return <img src={url} alt={alt} loading="lazy" draggable={false} className={cn('object-cover', className)} />
}
