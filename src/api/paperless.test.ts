import { describe, expect, it } from 'vitest'
import { filtersToParams } from './paperless'

describe('filtersToParams', () => {
  it('bildet alle Filter auf Paperless-Query-Parameter ab', () => {
    expect(
      filtersToParams({
        query: 'rechnung',
        tags: [1, 2],
        correspondent: 5,
        documentType: 'none',
        storagePath: 3,
        createdFrom: '2026-01-01',
        createdTo: '2026-06-30',
        inbox: true,
      }),
    ).toEqual({
      query: 'rechnung',
      tags__id__all: '1,2',
      correspondent__id: 5,
      document_type__isnull: true,
      storage_path__id: 3,
      created__date__gte: '2026-01-01',
      created__date__lte: '2026-06-30',
      is_in_inbox: true,
    })
  })

  it('lässt leere Filter weg', () => {
    expect(filtersToParams({})).toEqual({})
    expect(filtersToParams({ tags: [] })).toEqual({})
  })

  it('unterstützt more_like_id', () => {
    expect(filtersToParams({ moreLikeId: 42 })).toEqual({ more_like_id: 42 })
  })
})
