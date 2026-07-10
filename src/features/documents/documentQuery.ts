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
  const idList = (value: string | null) => (value ? value.split(',').map(Number).filter(Number.isFinite) : undefined)
  const q = params.get('q')
  if (q) filters.query = q
  const tc = params.get('tc')
  if (tc) filters.titleContent = tc
  const tags = idList(params.get('tags'))
  if (tags) filters.tags = tags
  const tagsAny = idList(params.get('tagsAny'))
  if (tagsAny) filters.tagsAny = tagsAny
  const tagsNot = idList(params.get('tagsNot'))
  if (tagsNot) filters.tagsExclude = tagsNot
  const tagged = params.get('tagged')
  if (tagged) filters.tagged = tagged === '1'
  const corr = params.get('corr')
  if (corr) filters.correspondent = corr === 'none' ? 'none' : Number(corr)
  const corrAny = idList(params.get('corrAny'))
  if (corrAny) filters.correspondentAny = corrAny
  const type = params.get('type')
  if (type) filters.documentType = type === 'none' ? 'none' : Number(type)
  const typeAny = idList(params.get('typeAny'))
  if (typeAny) filters.documentTypeAny = typeAny
  const path = params.get('path')
  if (path) filters.storagePath = path === 'none' ? 'none' : Number(path)
  const pathAny = idList(params.get('pathAny'))
  if (pathAny) filters.storagePathAny = pathAny
  const from = params.get('from')
  if (from) filters.createdFrom = from
  const to = params.get('to')
  if (to) filters.createdTo = to
  const addedFrom = params.get('addedFrom')
  if (addedFrom) filters.addedFrom = addedFrom
  const addedTo = params.get('addedTo')
  if (addedTo) filters.addedTo = addedTo
  if (params.get('inbox') === '1') filters.inbox = true
  return filters
}

export function filtersToSearchParams(filters: DocumentFilters, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base)
  const setOrDelete = (key: string, value: string | undefined) => {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  const joinOrNothing = (list: number[] | undefined) => (list?.length ? list.join(',') : undefined)
  setOrDelete('q', filters.query)
  setOrDelete('tc', filters.titleContent)
  setOrDelete('tags', joinOrNothing(filters.tags))
  setOrDelete('tagsAny', joinOrNothing(filters.tagsAny))
  setOrDelete('tagsNot', joinOrNothing(filters.tagsExclude))
  setOrDelete('tagged', filters.tagged != null ? (filters.tagged ? '1' : '0') : undefined)
  setOrDelete('corr', filters.correspondent != null ? String(filters.correspondent) : undefined)
  setOrDelete('corrAny', joinOrNothing(filters.correspondentAny))
  setOrDelete('type', filters.documentType != null ? String(filters.documentType) : undefined)
  setOrDelete('typeAny', joinOrNothing(filters.documentTypeAny))
  setOrDelete('path', filters.storagePath != null ? String(filters.storagePath) : undefined)
  setOrDelete('pathAny', joinOrNothing(filters.storagePathAny))
  setOrDelete('from', filters.createdFrom)
  setOrDelete('to', filters.createdTo)
  setOrDelete('addedFrom', filters.addedFrom)
  setOrDelete('addedTo', filters.addedTo)
  setOrDelete('inbox', filters.inbox ? '1' : undefined)
  return params
}

export function countActiveFilters(filters: DocumentFilters): number {
  let count = 0
  if (filters.titleContent) count++
  if (filters.tags?.length) count += filters.tags.length
  if (filters.tagsAny?.length) count += filters.tagsAny.length
  if (filters.tagsExclude?.length) count += filters.tagsExclude.length
  if (filters.tagged != null) count++
  if (filters.correspondent != null) count++
  if (filters.correspondentAny?.length) count++
  if (filters.documentType != null) count++
  if (filters.documentTypeAny?.length) count++
  if (filters.storagePath != null) count++
  if (filters.storagePathAny?.length) count++
  if (filters.createdFrom) count++
  if (filters.createdTo) count++
  if (filters.addedFrom) count++
  if (filters.addedTo) count++
  if (filters.inbox) count++
  return count
}

/** Paperless-Filter-Rule-Typen (Auswahl), siehe src-ui/src/app/data/filter-rule-type.ts in paperless-ngx. */
const RULE = {
  CORRESPONDENT: 3,
  DOCUMENT_TYPE: 4,
  IS_IN_INBOX: 5,
  HAS_TAGS_ALL: 6,
  HAS_ANY_TAG: 7,
  CREATED_BEFORE: 8,
  CREATED_AFTER: 9,
  ADDED_BEFORE: 13,
  ADDED_AFTER: 14,
  DOES_NOT_HAVE_TAG: 17,
  TITLE_CONTENT: 19,
  FULLTEXT: 20,
  HAS_TAGS_ANY: 22,
  STORAGE_PATH: 25,
  HAS_CORRESPONDENT_ANY: 26,
  HAS_DOCUMENT_TYPE_ANY: 28,
  HAS_STORAGE_PATH_ANY: 30,
  CREATED_TO: 43,
  CREATED_FROM: 44,
  ADDED_TO: 45,
  ADDED_FROM: 46,
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
      case RULE.TITLE_CONTENT:
        if (v) filters.titleContent = v
        break
      case RULE.HAS_TAGS_ALL:
        if (v) (filters.tags ??= []).push(Number(v))
        break
      case RULE.HAS_TAGS_ANY:
        if (v) (filters.tagsAny ??= []).push(Number(v))
        break
      case RULE.DOES_NOT_HAVE_TAG:
        if (v) (filters.tagsExclude ??= []).push(Number(v))
        break
      case RULE.HAS_ANY_TAG:
        filters.tagged = v === 'true' || v === '1'
        break
      case RULE.CORRESPONDENT:
        filters.correspondent = v === null ? 'none' : Number(v)
        break
      case RULE.HAS_CORRESPONDENT_ANY:
        if (v) (filters.correspondentAny ??= []).push(Number(v))
        break
      case RULE.DOCUMENT_TYPE:
        filters.documentType = v === null ? 'none' : Number(v)
        break
      case RULE.HAS_DOCUMENT_TYPE_ANY:
        if (v) (filters.documentTypeAny ??= []).push(Number(v))
        break
      case RULE.STORAGE_PATH:
        filters.storagePath = v === null ? 'none' : Number(v)
        break
      case RULE.HAS_STORAGE_PATH_ANY:
        if (v) (filters.storagePathAny ??= []).push(Number(v))
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
      case RULE.ADDED_FROM:
      case RULE.ADDED_AFTER:
        if (v) filters.addedFrom = v.slice(0, 10)
        break
      case RULE.ADDED_TO:
      case RULE.ADDED_BEFORE:
        if (v) filters.addedTo = v.slice(0, 10)
        break
    }
  }
  return filters
}

export function filtersToSavedViewRules(filters: DocumentFilters): SavedViewFilterRule[] {
  const rules: SavedViewFilterRule[] = []
  if (filters.query) rules.push({ rule_type: RULE.FULLTEXT, value: filters.query })
  if (filters.titleContent) rules.push({ rule_type: RULE.TITLE_CONTENT, value: filters.titleContent })
  for (const tag of filters.tags ?? []) rules.push({ rule_type: RULE.HAS_TAGS_ALL, value: String(tag) })
  for (const tag of filters.tagsAny ?? []) rules.push({ rule_type: RULE.HAS_TAGS_ANY, value: String(tag) })
  for (const tag of filters.tagsExclude ?? []) rules.push({ rule_type: RULE.DOES_NOT_HAVE_TAG, value: String(tag) })
  if (filters.tagged != null) rules.push({ rule_type: RULE.HAS_ANY_TAG, value: String(filters.tagged) })
  if (filters.correspondent != null)
    rules.push({ rule_type: RULE.CORRESPONDENT, value: filters.correspondent === 'none' ? null : String(filters.correspondent) })
  for (const id of filters.correspondentAny ?? []) rules.push({ rule_type: RULE.HAS_CORRESPONDENT_ANY, value: String(id) })
  if (filters.documentType != null)
    rules.push({ rule_type: RULE.DOCUMENT_TYPE, value: filters.documentType === 'none' ? null : String(filters.documentType) })
  for (const id of filters.documentTypeAny ?? []) rules.push({ rule_type: RULE.HAS_DOCUMENT_TYPE_ANY, value: String(id) })
  if (filters.storagePath != null)
    rules.push({ rule_type: RULE.STORAGE_PATH, value: filters.storagePath === 'none' ? null : String(filters.storagePath) })
  for (const id of filters.storagePathAny ?? []) rules.push({ rule_type: RULE.HAS_STORAGE_PATH_ANY, value: String(id) })
  if (filters.inbox) rules.push({ rule_type: RULE.IS_IN_INBOX, value: 'true' })
  if (filters.createdFrom) rules.push({ rule_type: RULE.CREATED_FROM, value: filters.createdFrom })
  if (filters.createdTo) rules.push({ rule_type: RULE.CREATED_TO, value: filters.createdTo })
  if (filters.addedFrom) rules.push({ rule_type: RULE.ADDED_FROM, value: filters.addedFrom })
  if (filters.addedTo) rules.push({ rule_type: RULE.ADDED_TO, value: filters.addedTo })
  return rules
}
