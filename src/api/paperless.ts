/** Typisierte Paperless-Endpunkte auf Basis des PaperlessClient. */
import type { PaperlessClient } from './client'
import type {
  Correspondent,
  CustomField,
  DocumentFilters,
  DocumentMetadata,
  DocumentNote,
  DocumentOrdering,
  DocumentType,
  DocumentVersion,
  Paginated,
  PaperlessDocument,
  PaperlessTask,
  SavedView,
  Statistics,
  StoragePath,
  Tag,
  TrashDocument,
  UiSettingsResponse,
} from './types'

export function filtersToParams(filters: DocumentFilters): Record<string, string | number | boolean | undefined> {
  const params: Record<string, string | number | boolean | undefined> = {}
  if (filters.query) params.query = filters.query
  if (filters.tags?.length) params.tags__id__all = filters.tags.join(',')
  if (filters.tagsExclude?.length) params.tags__id__none = filters.tagsExclude.join(',')
  if (filters.correspondent === 'none') params.correspondent__isnull = true
  else if (filters.correspondent != null) params.correspondent__id = filters.correspondent
  if (filters.documentType === 'none') params.document_type__isnull = true
  else if (filters.documentType != null) params.document_type__id = filters.documentType
  if (filters.storagePath === 'none') params.storage_path__isnull = true
  else if (filters.storagePath != null) params.storage_path__id = filters.storagePath
  if (filters.createdFrom) params.created__date__gte = filters.createdFrom
  if (filters.createdTo) params.created__date__lte = filters.createdTo
  if (filters.addedFrom) params.added__date__gte = filters.addedFrom
  if (filters.addedTo) params.added__date__lte = filters.addedTo
  if (filters.inbox) params.is_in_inbox = true
  if (filters.moreLikeId != null) params.more_like_id = filters.moreLikeId
  if (filters.customField) params[`custom_field_query`] = JSON.stringify(['AND', [[filters.customField.id, 'icontains', filters.customField.value]]])
  return params
}

export function createApi(client: PaperlessClient) {
  return {
    client,

    // ---------- Dokumente ----------
    listDocuments(opts: {
      page?: number
      pageSize?: number
      ordering?: DocumentOrdering
      filters?: DocumentFilters
      signal?: AbortSignal
    }) {
      return client.get<Paginated<PaperlessDocument>>(
        '/api/documents/',
        {
          page: opts.page ?? 1,
          page_size: opts.pageSize ?? 50,
          ordering: opts.ordering ?? '-created',
          truncate_content: true,
          ...(opts.filters ? filtersToParams(opts.filters) : {}),
        },
        opts.signal,
      )
    },

    getDocument(id: number, versionId?: number) {
      return client.get<PaperlessDocument>(`/api/documents/${id}/`, versionId ? { version: versionId } : undefined)
    },

    updateDocument(id: number, patch: Partial<PaperlessDocument>) {
      return client.patch<PaperlessDocument>(`/api/documents/${id}/`, patch)
    },

    deleteDocument(id: number) {
      return client.delete(`/api/documents/${id}/`)
    },

    getMetadata(id: number, versionId?: number) {
      return client.get<DocumentMetadata>(`/api/documents/${id}/metadata/`, versionId ? { version: versionId } : undefined)
    },

    /** Originaldatei laden – für die Annotationsbearbeitung immer original=true. */
    downloadOriginal(id: number, versionId?: number, signal?: AbortSignal) {
      return client.getBlob(`/api/documents/${id}/download/`, { original: true, version: versionId }, signal)
    },

    downloadArchive(id: number, signal?: AbortSignal) {
      return client.getBlob(`/api/documents/${id}/download/`, undefined, signal)
    },

    thumbUrl(id: number, versionId?: number) {
      return client.url(`/api/documents/${id}/thumb/`, versionId ? { version: versionId } : undefined)
    },

    previewUrl(id: number, versionId?: number) {
      return client.url(`/api/documents/${id}/preview/`, versionId ? { version: versionId } : undefined)
    },

    getPreviewBlob(id: number, versionId?: number, signal?: AbortSignal) {
      return client.getBlob(`/api/documents/${id}/preview/`, versionId ? { version: versionId } : undefined, signal)
    },

    getThumbBlob(id: number, versionId?: number, signal?: AbortSignal) {
      return client.getBlob(`/api/documents/${id}/thumb/`, versionId ? { version: versionId } : undefined, signal)
    },

    autocomplete(term: string, signal?: AbortSignal) {
      return client.get<string[]>('/api/search/autocomplete/', { term, limit: 8 }, signal)
    },

    // ---------- Notizen ----------
    listNotes(documentId: number) {
      return client.get<DocumentNote[]>(`/api/documents/${documentId}/notes/`)
    },
    addNote(documentId: number, note: string) {
      return client.post<DocumentNote[]>(`/api/documents/${documentId}/notes/`, { note })
    },
    deleteNote(documentId: number, noteId: number) {
      return client.request<void>(`/api/documents/${documentId}/notes/`, { method: 'DELETE', params: { id: noteId } })
    },

    // ---------- Versionen (v3) ----------
    uploadVersion(documentId: number, file: Blob, filename: string, versionLabel?: string) {
      const formData = new FormData()
      formData.append('document', file, filename)
      if (versionLabel) formData.append('version_label', versionLabel)
      return client.request<unknown>(`/api/documents/${documentId}/update_version/`, { method: 'POST', formData })
    },
    patchVersion(rootId: number, versionId: number, patch: { version_label: string }) {
      return client.patch<DocumentVersion>(`/api/documents/${rootId}/versions/${versionId}/`, patch)
    },
    deleteVersion(rootId: number, versionId: number) {
      return client.delete(`/api/documents/${rootId}/versions/${versionId}/`)
    },

    // ---------- Upload ----------
    async uploadDocument(opts: {
      file: File
      title?: string
      tags?: number[]
      correspondent?: number
      documentType?: number
      created?: string
    }) {
      const formData = new FormData()
      formData.append('document', opts.file)
      if (opts.title) formData.append('title', opts.title)
      if (opts.correspondent != null) formData.append('correspondent', String(opts.correspondent))
      if (opts.documentType != null) formData.append('document_type', String(opts.documentType))
      if (opts.created) formData.append('created', opts.created)
      for (const tag of opts.tags ?? []) formData.append('tags', String(tag))
      // Antwort ist die Task-UUID als String
      return client.request<string>('/api/documents/post_document/', { method: 'POST', formData })
    },

    // ---------- Stammdaten ----------
    listTags() {
      return client.get<Paginated<Tag>>('/api/tags/', { page_size: 1000, ordering: 'name' })
    },
    createTag(data: Partial<Tag>) {
      return client.post<Tag>('/api/tags/', data)
    },
    updateTag(id: number, data: Partial<Tag>) {
      return client.patch<Tag>(`/api/tags/${id}/`, data)
    },
    deleteTag(id: number) {
      return client.delete(`/api/tags/${id}/`)
    },

    listCorrespondents() {
      return client.get<Paginated<Correspondent>>('/api/correspondents/', { page_size: 1000, ordering: 'name' })
    },
    createCorrespondent(data: Partial<Correspondent>) {
      return client.post<Correspondent>('/api/correspondents/', data)
    },
    updateCorrespondent(id: number, data: Partial<Correspondent>) {
      return client.patch<Correspondent>(`/api/correspondents/${id}/`, data)
    },
    deleteCorrespondent(id: number) {
      return client.delete(`/api/correspondents/${id}/`)
    },

    listDocumentTypes() {
      return client.get<Paginated<DocumentType>>('/api/document_types/', { page_size: 1000, ordering: 'name' })
    },
    createDocumentType(data: Partial<DocumentType>) {
      return client.post<DocumentType>('/api/document_types/', data)
    },
    updateDocumentType(id: number, data: Partial<DocumentType>) {
      return client.patch<DocumentType>(`/api/document_types/${id}/`, data)
    },
    deleteDocumentType(id: number) {
      return client.delete(`/api/document_types/${id}/`)
    },

    listStoragePaths() {
      return client.get<Paginated<StoragePath>>('/api/storage_paths/', { page_size: 1000, ordering: 'name' })
    },
    createStoragePath(data: Partial<StoragePath>) {
      return client.post<StoragePath>('/api/storage_paths/', data)
    },
    updateStoragePath(id: number, data: Partial<StoragePath>) {
      return client.patch<StoragePath>(`/api/storage_paths/${id}/`, data)
    },
    deleteStoragePath(id: number) {
      return client.delete(`/api/storage_paths/${id}/`)
    },

    listCustomFields() {
      return client.get<Paginated<CustomField>>('/api/custom_fields/', { page_size: 1000, ordering: 'name' })
    },
    createCustomField(data: Partial<CustomField>) {
      return client.post<CustomField>('/api/custom_fields/', data)
    },
    updateCustomField(id: number, data: Partial<CustomField>) {
      return client.patch<CustomField>(`/api/custom_fields/${id}/`, data)
    },
    deleteCustomField(id: number) {
      return client.delete(`/api/custom_fields/${id}/`)
    },

    // ---------- Gespeicherte Ansichten ----------
    listSavedViews() {
      return client.get<Paginated<SavedView>>('/api/saved_views/', { page_size: 100 })
    },
    createSavedView(data: Partial<SavedView>) {
      return client.post<SavedView>('/api/saved_views/', data)
    },
    updateSavedView(id: number, data: Partial<SavedView>) {
      return client.patch<SavedView>(`/api/saved_views/${id}/`, data)
    },
    deleteSavedView(id: number) {
      return client.delete(`/api/saved_views/${id}/`)
    },

    // ---------- Sonstiges ----------
    statistics() {
      return client.get<Statistics>('/api/statistics/')
    },
    uiSettings() {
      return client.get<UiSettingsResponse>('/api/ui_settings/')
    },
    listTasks() {
      return client.get<PaperlessTask[]>('/api/tasks/')
    },
    acknowledgeTasks(taskIds: number[]) {
      return client.post('/api/acknowledge_tasks/', { tasks: taskIds })
    },

    bulkEdit(documents: number[], method: string, parameters: Record<string, unknown> = {}) {
      return client.post('/api/documents/bulk_edit/', { documents, method, parameters })
    },

    listTrash(page = 1) {
      return client.get<Paginated<TrashDocument>>('/api/trash/', { page, page_size: 50 })
    },
    trashAction(action: 'restore' | 'empty', documents: number[]) {
      return client.post('/api/trash/', { action, documents })
    },
  }
}

export type PaperlessApi = ReturnType<typeof createApi>
