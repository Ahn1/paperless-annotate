import { useInfiniteQuery } from '@tanstack/react-query'
import { useApi } from '@/stores/session'
import type { DocumentFilters, DocumentOrdering, SavedView, SavedViewFilterRule } from '@/api/types'
import { useSettings } from '@/stores/settings'

export function useDocumentsInfinite(filters: DocumentFilters, ordering: DocumentOrdering) {
  const api = useApi()
  const pageSize = useSettings((s) => s.pageSize)
  return useInfiniteQuery({
    queryKey: [api.client.baseUrl, 'documents', filters, ordering, pageSize],
    queryFn: ({ pageParam, signal }) => api.listDocuments({ page: pageParam, pageSize, ordering, filters, signal }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => (lastPage.next ? pages.length + 1 : undefined),
  })
}

/** URL-Suchparameter ↔ Filterzustand */
export function filtersFromSearchParams(params: URLSearchParams): DocumentFilters {
  const filters: DocumentFilters = {}
  const q = params.get('q')
  if (q) filters.query = q
  const tags = params.get('tags')
  if (tags) filters.tags = tags.split(',').map(Number).filter(Number.isFinite)
  const corr = params.get('corr')
  if (corr) filters.correspondent = corr === 'none' ? 'none' : Number(corr)
  const type = params.get('type')
  if (type) filters.documentType = type === 'none' ? 'none' : Number(type)
  const path = params.get('path')
  if (path) filters.storagePath = path === 'none' ? 'none' : Number(path)
  const from = params.get('from')
  if (from) filters.createdFrom = from
  const to = params.get('to')
  if (to) filters.createdTo = to
  if (params.get('inbox') === '1') filters.inbox = true
  return filters
}

export function filtersToSearchParams(filters: DocumentFilters, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base)
  const setOrDelete = (key: string, value: string | undefined) => {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  setOrDelete('q', filters.query)
  setOrDelete('tags', filters.tags?.length ? filters.tags.join(',') : undefined)
  setOrDelete('corr', filters.correspondent != null ? String(filters.correspondent) : undefined)
  setOrDelete('type', filters.documentType != null ? String(filters.documentType) : undefined)
  setOrDelete('path', filters.storagePath != null ? String(filters.storagePath) : undefined)
  setOrDelete('from', filters.createdFrom)
  setOrDelete('to', filters.createdTo)
  setOrDelete('inbox', filters.inbox ? '1' : undefined)
  return params
}

export function countActiveFilters(filters: DocumentFilters): number {
  let count = 0
  if (filters.tags?.length) count += filters.tags.length
  if (filters.correspondent != null) count++
  if (filters.documentType != null) count++
  if (filters.storagePath != null) count++
  if (filters.createdFrom) count++
  if (filters.createdTo) count++
  if (filters.inbox) count++
  return count
}

/** Paperless-Filter-Rule-Typen (Auswahl), siehe SavedViewFilterRule. */
const RULE = {
  CORRESPONDENT: 3,
  DOCUMENT_TYPE: 4,
  IS_IN_INBOX: 5,
  HAS_TAG: 6,
  CREATED_BEFORE: 8,
  CREATED_AFTER: 9,
  FULLTEXT: 20,
  STORAGE_PATH: 25,
  CREATED_TO: 39,
  CREATED_FROM: 40,
} as const

/** Gespeicherte Ansicht → Filterzustand (unbekannte Regeln werden ignoriert). */
export function savedViewToFilters(view: SavedView): DocumentFilters {
  const filters: DocumentFilters = {}
  for (const rule of view.filter_rules) {
    const v = rule.value
    switch (rule.rule_type) {
      case RULE.FULLTEXT:
        if (v) filters.query = v
        break
      case RULE.HAS_TAG:
        if (v) (filters.tags ??= []).push(Number(v))
        break
      case RULE.CORRESPONDENT:
        filters.correspondent = v === null ? 'none' : Number(v)
        break
      case RULE.DOCUMENT_TYPE:
        filters.documentType = v === null ? 'none' : Number(v)
        break
      case RULE.STORAGE_PATH:
        filters.storagePath = v === null ? 'none' : Number(v)
        break
      case RULE.IS_IN_INBOX:
        filters.inbox = v === 'true' || v === '1'
        break
      case RULE.CREATED_FROM:
      case RULE.CREATED_AFTER:
        if (v) filters.createdFrom = v.slice(0, 10)
        break
      case RULE.CREATED_TO:
      case RULE.CREATED_BEFORE:
        if (v) filters.createdTo = v.slice(0, 10)
        break
    }
  }
  return filters
}

export function filtersToSavedViewRules(filters: DocumentFilters): SavedViewFilterRule[] {
  const rules: SavedViewFilterRule[] = []
  if (filters.query) rules.push({ rule_type: RULE.FULLTEXT, value: filters.query })
  for (const tag of filters.tags ?? []) rules.push({ rule_type: RULE.HAS_TAG, value: String(tag) })
  if (filters.correspondent != null)
    rules.push({ rule_type: RULE.CORRESPONDENT, value: filters.correspondent === 'none' ? null : String(filters.correspondent) })
  if (filters.documentType != null)
    rules.push({ rule_type: RULE.DOCUMENT_TYPE, value: filters.documentType === 'none' ? null : String(filters.documentType) })
  if (filters.storagePath != null)
    rules.push({ rule_type: RULE.STORAGE_PATH, value: filters.storagePath === 'none' ? null : String(filters.storagePath) })
  if (filters.inbox) rules.push({ rule_type: RULE.IS_IN_INBOX, value: 'true' })
  if (filters.createdFrom) rules.push({ rule_type: RULE.CREATED_FROM, value: filters.createdFrom })
  if (filters.createdTo) rules.push({ rule_type: RULE.CREATED_TO, value: filters.createdTo })
  return rules
}
