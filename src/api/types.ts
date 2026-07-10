/** Typen der Paperless-ngx-REST-API (v3, API-Version 10). */

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  all?: number[]
  results: T[]
}

export interface Tag {
  id: number
  name: string
  slug?: string
  color: string
  text_color?: string
  parent?: number | null
  is_inbox_tag: boolean
  document_count?: number
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  owner?: number | null
}

export interface Correspondent {
  id: number
  name: string
  document_count?: number
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  owner?: number | null
}

export interface DocumentType {
  id: number
  name: string
  document_count?: number
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  owner?: number | null
}

export interface StoragePath {
  id: number
  name: string
  path: string
  document_count?: number
  matching_algorithm: number
  match: string
  is_insensitive: boolean
  owner?: number | null
}

export type CustomFieldDataType =
  | 'string'
  | 'url'
  | 'date'
  | 'boolean'
  | 'integer'
  | 'float'
  | 'monetary'
  | 'documentlink'
  | 'select'

export interface CustomField {
  id: number
  name: string
  data_type: CustomFieldDataType
  extra_data?: { select_options?: { id: string; label: string }[]; default_currency?: string | null }
  document_count?: number
}

export interface CustomFieldInstance {
  field: number
  value: unknown
}

export interface DocumentVersion {
  id: number
  version_label: string | null
  created: string
  /** true bei der aktuell aktiven Version */
  is_current?: boolean
}

export interface PaperlessDocument {
  id: number
  title: string
  content?: string
  created: string
  modified: string
  added: string
  correspondent: number | null
  document_type: number | null
  storage_path: number | null
  tags: number[]
  archive_serial_number: number | null
  original_file_name?: string
  archived_file_name?: string | null
  custom_fields: CustomFieldInstance[]
  notes: DocumentNote[]
  owner?: number | null
  user_can_change?: boolean
  page_count?: number | null
  mime_type?: string
  /** v3: Versionen des Dokuments (am Root-Dokument). */
  versions?: DocumentVersion[]
  root_document?: number | null
}

export interface DocumentNote {
  id: number
  note: string
  created: string
  user?: { id: number; username: string; first_name?: string; last_name?: string } | number
}

export interface DocumentMetadata {
  original_checksum: string
  original_size: number
  original_mime_type: string
  media_filename: string
  has_archive_version: boolean
  original_metadata: unknown[]
  archive_checksum: string | null
  archive_media_filename: string | null
  archive_size: number | null
  archive_metadata: unknown[] | null
  lang: string
}

export interface SavedViewFilterRule {
  rule_type: number
  value: string | null
}

export interface SavedView {
  id: number
  name: string
  show_on_dashboard: boolean
  show_in_sidebar: boolean
  sort_field: string | null
  sort_reverse: boolean
  filter_rules: SavedViewFilterRule[]
  page_size?: number | null
  display_mode?: string | null
}

export interface Statistics {
  documents_total: number
  documents_inbox: number
  inbox_tag?: number | null
  inbox_tags?: number[] | null
  document_file_type_counts?: { mime_type: string; mime_type_count: number }[]
  character_count?: number
  tag_count?: number
  correspondent_count?: number
  document_type_count?: number
  storage_path_count?: number
  current_asn?: number
}

export interface PaperlessTask {
  id: number
  task_id: string
  task_file_name: string | null
  date_created: string
  date_done: string | null
  type: string
  status: 'PENDING' | 'STARTED' | 'SUCCESS' | 'FAILURE' | 'RETRY' | 'REVOKED'
  result: string | null
  acknowledged: boolean
  related_document?: string | null
}

export interface TrashDocument {
  id: number
  title: string
  deleted_at: string
}

export interface UiSettingsResponse {
  user: { id: number; username: string; is_superuser?: boolean; first_name?: string; last_name?: string }
  settings: unknown
  permissions: string[]
}

export interface AutocompleteResult extends Array<string> {}

/** Sortierfelder der Dokumentenliste. */
export type DocumentOrdering =
  | 'created'
  | '-created'
  | 'added'
  | '-added'
  | 'title'
  | '-title'
  | 'correspondent__name'
  | '-correspondent__name'
  | 'archive_serial_number'
  | '-archive_serial_number'

export interface DocumentFilters {
  query?: string
  tags?: number[]
  tagsExclude?: number[]
  correspondent?: number | 'none'
  documentType?: number | 'none'
  storagePath?: number | 'none'
  createdFrom?: string
  createdTo?: string
  addedFrom?: string
  addedTo?: string
  inbox?: boolean
  moreLikeId?: number
  customField?: { id: number; value: string }
}

export const MATCHING_ALGORITHMS = [
  { id: 0, key: 'none' },
  { id: 1, key: 'any' },
  { id: 2, key: 'all' },
  { id: 3, key: 'literal' },
  { id: 4, key: 'regex' },
  { id: 5, key: 'fuzzy' },
  { id: 6, key: 'auto' },
] as const
