import { describe, expect, it } from 'vitest'
import { backTargetFor, defaultBackTarget, documentPath, originState, readOrigin } from './navigation'

describe('readOrigin', () => {
  it('liest eine bekannte Herkunft', () => {
    expect(readOrigin({ origin: { id: 'inbox' } })).toEqual({ id: 'inbox', search: undefined })
  })

  it('übernimmt den Query-String der Liste', () => {
    expect(readOrigin({ origin: { id: 'documents', search: 'sort=title' } })).toEqual({
      id: 'documents',
      search: 'sort=title',
    })
  })

  it('verwirft alles, was keine bekannte Herkunft ist', () => {
    expect(readOrigin(null)).toBeUndefined()
    expect(readOrigin({})).toBeUndefined()
    expect(readOrigin({ origin: 'inbox' })).toBeUndefined()
    expect(readOrigin({ origin: { id: 'trash' } })).toBeUndefined()
    expect(readOrigin({ origin: { id: 'toString' } })).toBeUndefined()
  })
})

describe('backTargetFor', () => {
  it('nimmt ohne Herkunft die Dokumentenliste', () => {
    expect(backTargetFor(undefined)).toEqual(defaultBackTarget)
    expect(defaultBackTarget).toEqual({ to: '/documents', labelKey: 'nav.documents' })
  })

  it('beschriftet den Knopf mit der Herkunft', () => {
    expect(backTargetFor({ id: 'inbox' })).toEqual({ to: '/inbox', labelKey: 'nav.inbox' })
  })

  it('hängt den Query-String der Liste an', () => {
    expect(backTargetFor({ id: 'documents', search: 'sort=title' }).to).toBe('/documents?sort=title')
  })
})

describe('originState', () => {
  it('gibt ohne Herkunft keinen State mit', () => {
    expect(originState(undefined)).toBeUndefined()
    expect(originState({ id: 'inbox' })).toEqual({ origin: { id: 'inbox' } })
  })
})

describe('documentPath', () => {
  it('zeigt auf die Detailseite', () => {
    expect(documentPath(7)).toBe('/documents/7')
  })
})
