import { useRef } from 'react'
import { useAnnotationCapability } from '@embedpdf/plugin-annotation/react'
import { useSettings } from '@/stores/settings'
import { PEN_SURFACE_TOUCH_ACTION, displayToPagePoint, usePageTransform, usePenSurface, type PenPoint } from './penInput'

/**
 * Radierer: transparente Ebene über der Seite. Antippen oder Darüberstreichen
 * löscht einzelne Annotation-Objekte (Treffer über deren Rechtecke, mit Toleranz).
 * Löschungen laufen über das Annotation-Plugin und sind damit per Undo rückholbar.
 * Eingabe-Politik wie beim Zeichnen: Stift und Maus radieren, Finger scrollt
 * (außer „Auch Finger zeichnet“ ist aktiv).
 */
export function EraserLayer({ docId, pageIndex }: { docId: string; pageIndex: number }) {
  const { provides: annotationCap } = useAnnotationCapability()
  const settings = useSettings()
  const { rotation, scale } = usePageTransform(docId, pageIndex)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const erasedIds = useRef<Set<string>>(new Set())

  function eraseAt(point: PenPoint) {
    const el = surfaceRef.current
    const annotations = annotationCap?.forDocument(docId)
    if (!el || !annotations) return
    const { x, y } = displayToPagePoint(el, point, rotation, scale)
    const tolerance = 6 / scale

    for (const tracked of annotations.getAnnotations({ pageIndex })) {
      const { id, rect } = tracked.object
      if (erasedIds.current.has(id)) continue
      if (
        x >= rect.origin.x - tolerance &&
        x <= rect.origin.x + rect.size.width + tolerance &&
        y >= rect.origin.y - tolerance &&
        y <= rect.origin.y + rect.size.height + tolerance
      ) {
        erasedIds.current.add(id)
        annotations.deleteAnnotation(pageIndex, id)
      }
    }
  }

  usePenSurface(surfaceRef, {
    fingerDraws: settings.penFingerDraws,
    onStart: (point) => {
      erasedIds.current.clear()
      eraseAt(point)
    },
    onMove: (points) => {
      for (const point of points) eraseAt(point)
    },
    onEnd: () => {},
    onCancel: () => {},
  })

  return (
    <div
      ref={surfaceRef}
      data-testid="eraser-layer"
      className="absolute inset-0 z-20 cursor-crosshair select-none"
      style={{ touchAction: settings.penFingerDraws ? 'none' : PEN_SURFACE_TOUCH_ACTION }}
    />
  )
}
