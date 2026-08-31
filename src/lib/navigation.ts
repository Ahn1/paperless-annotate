import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import type { TranslationKey } from '@/lib/i18n'

/**
 * Zurück folgt der Hierarchie, nicht dem Verlauf: Liste oder Posteingang →
 * Detailseite → Editor oder Lesemodus. Jeder Zurück-Knopf geht genau eine
 * Ebene hoch und benennt sein Ziel.
 *
 * Damit die Detailseite ihr Ziel kennt, geben Liste und Posteingang beim
 * Öffnen eines Dokuments ihre Herkunft im Router-State mit. Editor und
 * Lesemodus reichen sie unverändert weiter.
 */

/** Seiten, von denen aus ein Dokument geöffnet werden kann. */
export type OriginId = 'documents' | 'inbox'

export interface Origin {
  id: OriginId
  /** Query-String der Liste (Filter, Sortierung), damit sie unverändert zurückkommt. */
  search?: string
}

/** Ziel und Beschriftung eines Zurück-Knopfs. */
export interface BackTarget {
  to: string
  labelKey: TranslationKey
}

const originTargets: Record<OriginId, BackTarget> = {
  documents: { to: '/documents', labelKey: 'nav.documents' },
  inbox: { to: '/inbox', labelKey: 'nav.inbox' },
}

/** Fällt die Herkunft weg (Lesezeichen, Neuladen), gilt die Dokumentenliste. */
export const defaultBackTarget: BackTarget = originTargets.documents

/** Pfad der Detailseite – das Ziel von Editor und Lesemodus. */
export function documentPath(documentId: number): string {
  return `/documents/${documentId}`
}

/** Liest die Herkunft aus dem Router-State. Der State kommt aus dem Verlauf und kann alles enthalten. */
export function readOrigin(state: unknown): Origin | undefined {
  if (typeof state !== 'object' || state === null) return undefined
  const origin = (state as { origin?: unknown }).origin
  if (typeof origin !== 'object' || origin === null) return undefined
  const { id, search } = origin as { id?: unknown; search?: unknown }
  if (typeof id !== 'string' || !Object.hasOwn(originTargets, id)) return undefined
  return {
    id: id as OriginId,
    search: typeof search === 'string' && search.length > 0 ? search : undefined,
  }
}

/** Ziel und Beschriftung für den Zurück-Knopf der Detailseite. */
export function backTargetFor(origin: Origin | undefined): BackTarget {
  if (!origin) return defaultBackTarget
  const target = originTargets[origin.id]
  return { ...target, to: origin.search ? `${target.to}?${origin.search}` : target.to }
}

/** Router-State zum Weiterreichen der Herkunft. */
export function originState(origin: Origin | undefined): { origin: Origin } | undefined {
  return origin ? { origin } : undefined
}

/** Herkunft der aktuellen Seite (zum Weiterreichen an Editor und Lesemodus). */
export function useOrigin(): Origin | undefined {
  const state: unknown = useLocation().state
  return useMemo(() => readOrigin(state), [state])
}

/** Zurück-Ziel der Detailseite. */
export function useBackTarget(): BackTarget {
  return backTargetFor(useOrigin())
}
