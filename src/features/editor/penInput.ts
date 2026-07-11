import { useEffect, useRef, type RefObject } from 'react'
import { useDocumentState } from '@embedpdf/core/react'
import { restorePosition, transformPosition, transformSize, type Position, type Rotation } from '@embedpdf/models'

export interface PenPoint {
  x: number
  y: number
}

export interface PenSurfaceCallbacks {
  /** Finger zeichnet ebenfalls, statt zu scrollen. */
  fingerDraws: boolean
  onStart: (point: PenPoint) => void
  /** Erhält alle Zwischenpunkte (Coalesced Events) eines Move-Ereignisses. */
  onMove: (points: PenPoint[]) => void
  onEnd: () => void
  /** Vom Browser abgebrochener Strich (z. B. Systemgeste). */
  onCancel: () => void
}

/** Erlaubtes natives Touch-Verhalten auf Zeichenflächen: Finger scrollt/zoomt, solange er nicht zeichnet. */
export const PEN_SURFACE_TOUCH_ACTION = 'manipulation'

function isDrawingPointer(event: PointerEvent, fingerDraws: boolean): boolean {
  if (event.pointerType === 'pen') return true
  if (event.pointerType === 'mouse') return event.button === 0
  return fingerDraws
}

/**
 * Stift-Eingabe-Politik für Zeichenflächen: Stift und Maus zeichnen immer, der Finger
 * scrollt nativ weiter (außer `fingerDraws`). CSS `touch-action` kann Stift und Finger
 * nicht unterscheiden – iPadOS behandelt den Apple Pencil beim Scrollen wie einen Finger
 * und bricht Striche per `pointercancel` ab. Deshalb werden Stylus-Touches hier über
 * non-passive Touch-Listener gezielt unterdrückt (Touch.touchType === 'stylus'), während
 * Finger-Touches beim Browser bleiben.
 */
export function usePenSurface(ref: RefObject<HTMLElement | null>, callbacks: PenSurfaceCallbacks) {
  const cb = useRef(callbacks)
  cb.current = callbacks
  const fingerDraws = callbacks.fingerDraws

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let activePointerId: number | null = null
    let activePointerType = ''

    const toLocal = (e: { clientX: number; clientY: number }): PenPoint => {
      const rect = el.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (activePointerId !== null) return
      if (!isDrawingPointer(e, fingerDraws)) return
      activePointerId = e.pointerId
      activePointerType = e.pointerType
      e.preventDefault()
      e.stopPropagation()
      try {
        el.setPointerCapture(e.pointerId)
      } catch {
        // Pointer inzwischen weg (oder synthetisches Event) – ohne Capture weiterzeichnen
      }
      cb.current.onStart(toLocal(e))
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerId !== activePointerId) return
      e.preventDefault()
      e.stopPropagation()
      const coalesced = e.getCoalescedEvents?.() ?? []
      cb.current.onMove((coalesced.length > 0 ? coalesced : [e]).map(toLocal))
    }

    const finish = (e: PointerEvent, cancelled: boolean) => {
      if (e.pointerId !== activePointerId) return
      activePointerId = null
      activePointerType = ''
      e.stopPropagation()
      if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId)
      if (cancelled) cb.current.onCancel()
      else cb.current.onEnd()
    }
    const onPointerUp = (e: PointerEvent) => finish(e, false)
    const onPointerCancel = (e: PointerEvent) => finish(e, true)

    const onTouch = (e: TouchEvent) => {
      for (const touch of Array.from(e.touches)) {
        if ((touch as Touch & { touchType?: string }).touchType === 'stylus') {
          e.preventDefault()
          return
        }
      }
      // Während eines aktiven Strichs keine nativen Gesten starten lassen
      if (activePointerId !== null && activePointerType !== 'pen') e.preventDefault()
    }

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerCancel)
    el.addEventListener('touchstart', onTouch, { passive: false })
    el.addEventListener('touchmove', onTouch, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerCancel)
      el.removeEventListener('touchstart', onTouch)
      el.removeEventListener('touchmove', onTouch)
    }
  }, [ref, fingerDraws])
}

/** Rotation und Zoom einer Seite – dieselbe Quelle wie EmbedPDFs PagePointerProvider. */
export function usePageTransform(docId: string, pageIndex: number): { rotation: Rotation; scale: number } {
  const documentState = useDocumentState(docId)
  const pageRotation = documentState?.document?.pages?.[pageIndex]?.rotation ?? 0
  const docRotation = documentState?.rotation ?? 0
  return {
    rotation: (((pageRotation as number) + (docRotation as number)) % 4) as Rotation,
    scale: documentState?.scale ?? 1,
  }
}

/**
 * Rechnet einen Punkt relativ zur Zeichenfläche in unrotierte Seitenkoordinaten
 * (Zoom 1) um – identisch zu EmbedPDFs `defaultConvertEventToPoint`.
 */
export function displayToPagePoint(el: HTMLElement, point: PenPoint, rotation: Rotation, scale: number): Position {
  const rotatedSize = transformSize({ width: el.clientWidth, height: el.clientHeight }, rotation, 1)
  return restorePosition(rotatedSize, point, rotation, scale)
}

/** Umkehrung von {@link displayToPagePoint} – für die Live-Vorschau. */
export function pageToDisplayPoint(el: HTMLElement, point: Position, rotation: Rotation, scale: number): PenPoint {
  return transformPosition({ width: el.clientWidth / scale, height: el.clientHeight / scale }, point, rotation, scale)
}
