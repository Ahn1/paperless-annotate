import { describe, expect, it } from 'vitest'
import type { SavedView } from '@/api/types'
import {
  countActiveFilters,
  filtersFromSearchParams,
  filtersToSavedViewRules,
  filtersToSearchParams,
  savedViewToFilters,
} from './documentQuery'

describe('URL-Parameter ↔ Filter', () => {
  it('ist verlustfrei (Roundtrip)', () => {
    const filters = {
      query: 'miete',
      tags: [3, 7],
      correspondent: 2 as const,
      documentType: 'none' as const,
      createdFrom: '2025-01-01',
      inbox: true,
    }
    const params = filtersToSearchParams(filters)
    expect(filtersFromSearchParams(params)).toEqual(filters)
  })

  it('entfernt gelöschte Filter aus bestehenden Parametern', () => {
    const base = filtersToSearchParams({ query: 'a', tags: [1] })
    const next = filtersToSearchParams({ query: 'a' }, base)
    expect(next.get('tags')).toBeNull()
    expect(next.get('q')).toBe('a')
  })
})

describe('Gespeicherte Ansichten ↔ Filter', () => {
  it('mappt Filter auf Regeln und zurück (Roundtrip)', () => {
    const filters = {
      query: 'steuer',
      tags: [4, 9],
      correspondent: 1 as const,
      storagePath: 'none' as const,
      inbox: true,
      createdFrom: '2025-06-01',
      createdTo: '2026-06-01',
    }
    const view: SavedView = {
      id: 1,
      name: 'Test',
      show_on_dashboard: false,
      show_in_sidebar: true,
      sort_field: 'created',
      sort_reverse: true,
      filter_rules: filtersToSavedViewRules(filters),
    }
    expect(savedViewToFilters(view)).toEqual(filters)
  })

  it('versteht auch die älteren created-before/after-Regeln (8/9)', () => {
    const view: SavedView = {
      id: 2,
      name: 'Alt',
      show_on_dashboard: false,
      show_in_sidebar: false,
      sort_field: null,
      sort_reverse: false,
      filter_rules: [
        { rule_type: 9, value: '2025-01-01' },
        { rule_type: 8, value: '2025-12-31' },
      ],
    }
    expect(savedViewToFilters(view)).toEqual({ createdFrom: '2025-01-01', createdTo: '2025-12-31' })
  })

  it('ignoriert unbekannte Regeln', () => {
    const view: SavedView = {
      id: 3,
      name: 'Fremd',
      show_on_dashboard: false,
      show_in_sidebar: false,
      sort_field: null,
      sort_reverse: false,
      filter_rules: [{ rule_type: 999, value: 'x' }],
    }
    expect(savedViewToFilters(view)).toEqual({})
  })
})

describe('countActiveFilters', () => {
  it('zählt aktive Filter (ohne Volltextsuche)', () => {
    expect(countActiveFilters({})).toBe(0)
    expect(countActiveFilters({ query: 'x' })).toBe(0)
    expect(countActiveFilters({ tags: [1, 2], inbox: true, createdFrom: '2026-01-01' })).toBe(4)
  })
})
