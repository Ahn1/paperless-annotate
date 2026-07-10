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
      titleContent: 'vertrag',
      tags: [3, 7],
      tagsAny: [11],
      tagsExclude: [5],
      tagged: false,
      correspondent: 2 as const,
      correspondentAny: [4, 6],
      documentType: 'none' as const,
      documentTypeAny: [8],
      storagePathAny: [9],
      createdFrom: '2025-01-01',
      addedFrom: '2025-02-01',
      addedTo: '2025-03-01',
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
      titleContent: 'bescheid',
      tags: [4, 9],
      tagsAny: [12],
      tagsExclude: [3],
      tagged: true,
      correspondent: 1 as const,
      correspondentAny: [7],
      storagePath: 'none' as const,
      inbox: true,
      createdFrom: '2025-06-01',
      createdTo: '2026-06-01',
      addedFrom: '2025-07-01',
      addedTo: '2026-07-01',
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

  it('versteht Ansichten aus der offiziellen Paperless-Oberfläche (any/in-Regeln)', () => {
    const view: SavedView = {
      id: 4,
      name: 'Offiziell',
      show_on_dashboard: false,
      show_in_sidebar: true,
      sort_field: 'created',
      sort_reverse: true,
      filter_rules: [
        { rule_type: 19, value: 'rechnung' }, // Titel & Inhalt
        { rule_type: 22, value: '3' }, // hat einen der Tags
        { rule_type: 22, value: '7' },
        { rule_type: 17, value: '9' }, // hat Tag nicht
        { rule_type: 26, value: '2' }, // Korrespondent ist einer von
        { rule_type: 28, value: '5' }, // Dokumenttyp ist einer von
        { rule_type: 30, value: '1' }, // Speicherpfad ist einer von
        { rule_type: 44, value: '2025-01-01' }, // erstellt ab
        { rule_type: 43, value: '2025-12-31' }, // erstellt bis
      ],
    }
    expect(savedViewToFilters(view)).toEqual({
      titleContent: 'rechnung',
      tagsAny: [3, 7],
      tagsExclude: [9],
      correspondentAny: [2],
      documentTypeAny: [5],
      storagePathAny: [1],
      createdFrom: '2025-01-01',
      createdTo: '2025-12-31',
    })
  })

  it('schreibt Datumsregeln als 43/44 (nicht als Custom-Field-Regeln 39/40)', () => {
    const rules = filtersToSavedViewRules({ createdFrom: '2025-01-01', createdTo: '2025-12-31' })
    expect(rules).toEqual([
      { rule_type: 44, value: '2025-01-01' },
      { rule_type: 43, value: '2025-12-31' },
    ])
  })

  it('interpretiert Custom-Field-Regeln (39/40) nicht als Datum', () => {
    const view: SavedView = {
      id: 5,
      name: 'CustomFields',
      show_on_dashboard: false,
      show_in_sidebar: false,
      sort_field: null,
      sort_reverse: false,
      filter_rules: [
        { rule_type: 39, value: '1' }, // custom_fields__id__in
        { rule_type: 40, value: '2' }, // custom_fields__id__none
      ],
    }
    expect(savedViewToFilters(view)).toEqual({})
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
