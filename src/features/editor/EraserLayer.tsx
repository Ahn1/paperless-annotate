import { useRef } from 'react'
import { useAnnotationCapability } from '@embedpdf/plugin-annotation/react'
import { useZoom } from '@embedpdf/plugin-zoom/react'

/**
 * Radierer: transparente Ebene über der Seite. Antippen oder Darüberstreichen
 * löscht einzelne Annotation-Objekte (Treffer über deren Rechtecke, mit Toleranz).
 * Löschungen laufen über das Annotation-Plugin und sind damit per Undo rückholbar.
 */
export function EraserLayer({ docId, pageIndex }: { docId: string; pageIndex: number }) {
  const { provides: annotationCap } = useAnnotationCapability()
  const { state: zoomState } = useZoom(docId)
  const erasedIds = useRef<Set<string>>(new Set())

  function eraseAt(event: React.PointerEvent<HTMLDivElement>) {
    const annotations = annotationCap?.forDocument(docId)
    if (!annotations) return
    const bounds = event.currentTarget.getBoundingClientRect()
    // Annotation-Rechtecke liegen in Seitenkoordinaten bei Zoom 1 → Pointer-Position zurückrechnen
    const scale = zoomState?.currentZoomLevel || 1
    const x = (event.clientX - bounds.left) / scale
    const y = (event.clientY - bounds.top) / scale
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

  return (
    <div
      className="annotation-surface absolute inset-0 z-10 cursor-crosshair"
      onPointerDown={(event) => {
        erasedIds.current.clear()
        event.currentTarget.setPointerCapture(event.pointerId)
        eraseAt(event)
      }}
      onPointerMove={(event) => {
        if (event.buttons > 0) eraseAt(event)
      }}
    />
  )
}
