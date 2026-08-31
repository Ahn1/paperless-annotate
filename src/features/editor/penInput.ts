import { useEffect, useRef, type RefObject } from 'react'
import { useDocumentState } from '@embedpdf/core/react'
import { restorePosition, transformSize, type Position, type Rotation } from '@embedpdf/models'

export interface PenPoint {
  x: number
  y: number
  /**
   * Stiftdruck von 0 bis 1. Nur bei echter Stifteingabe gesetzt – Maus und Finger
   * melden laut Pointer-Events-Spezifikation den festen Ersatzwert 0.5.
   */
  pressure?: number
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

    const toLocal = (e: { clientX: number; clientY: number; pressure?: number; pointerType?: string }): PenPoint => {
      const rect = el.getBoundingClientRect()
      const point: PenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      if ((e.pointerType ?? activePointerType) === 'pen' && typeof e.pressure === 'number') {
        point.pressure = e.pressure
      }
      return point
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

/**
 * Rechnet einen Punkt aus unrotierten Seitenkoordinaten (Zoom 1) in den lokalen
 * Raum der Zeichenfläche um – für die Live-Vorschau.
 *
 * Hier fehlt die Rotation bewusst: die Seitenebenen stecken im `<Rotate>`-Wrapper,
 * der die Drehung per CSS erledigt. Innerhalb der Zeichenfläche gilt weiter das
 * ungedrehte Seitenraster, nur skaliert.
 */
export function pageToLocalPoint(point: Position, scale: number): PenPoint {
  return { x: point.x * scale, y: point.y * scale }
}
