import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/stores/session'

const STALE = 5 * 60 * 1000

/** Stammdaten-Hooks – gecacht pro Server. */
export function useTags() {
  const api = useApi()
  return useQuery({
    queryKey: [api.client.baseUrl, 'tags'],
    queryFn: () => api.listTags().then((r) => r.results),
    staleTime: STALE,
  })
}

export function useCorrespondents() {
  const api = useApi()
  return useQuery({
    queryKey: [api.client.baseUrl, 'correspondents'],
    queryFn: () => api.listCorrespondents().then((r) => r.results),
    staleTime: STALE,
  })
}

export function useDocumentTypes() {
  const api = useApi()
  return useQuery({
    queryKey: [api.client.baseUrl, 'document_types'],
    queryFn: () => api.listDocumentTypes().then((r) => r.results),
    staleTime: STALE,
  })
}

export function useStoragePaths() {
  const api = useApi()
  return useQuery({
    queryKey: [api.client.baseUrl, 'storage_paths'],
    queryFn: () => api.listStoragePaths().then((r) => r.results),
    staleTime: STALE,
  })
}

export function useCustomFields() {
  const api = useApi()
  return useQuery({
    queryKey: [api.client.baseUrl, 'custom_fields'],
    queryFn: () => api.listCustomFields().then((r) => r.results),
    staleTime: STALE,
  })
}

export function useSavedViews() {
  const api = useApi()
  return useQuery({
    queryKey: [api.client.baseUrl, 'saved_views'],
    queryFn: () => api.listSavedViews().then((r) => r.results),
    staleTime: STALE,
  })
}

export function useStatistics() {
  const api = useApi()
  return useQuery({
    queryKey: [api.client.baseUrl, 'statistics'],
    queryFn: () => api.statistics(),
    staleTime: 60 * 1000,
  })
}

/** Lookup-Maps für schnelle ID→Name-Auflösung in Listen. */
export function useLookups() {
  const tags = useTags()
  const correspondents = useCorrespondents()
  const documentTypes = useDocumentTypes()
  const storagePaths = useStoragePaths()
  return {
    tagById: new Map((tags.data ?? []).map((t) => [t.id, t])),
    correspondentById: new Map((correspondents.data ?? []).map((c) => [c.id, c])),
    documentTypeById: new Map((documentTypes.data ?? []).map((d) => [d.id, d])),
    storagePathById: new Map((storagePaths.data ?? []).map((s) => [s.id, s])),
    tags: tags.data ?? [],
    correspondents: correspondents.data ?? [],
    documentTypes: documentTypes.data ?? [],
    storagePaths: storagePaths.data ?? [],
  }
}
