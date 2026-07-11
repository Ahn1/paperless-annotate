import { useCallback, useEffect, useRef, useState } from 'react'
import { useAnnotationCapability } from '@embedpdf/plugin-annotation/react'
import {
  PdfAnnotationSubtype,
  PdfBlendMode,
  expandRect,
  rectFromPoints,
  uuidV4,
  type PdfInkAnnoObject,
  type Position,
} from '@embedpdf/models'
import { useSettings } from '@/stores/settings'
import {
  PEN_SURFACE_TOUCH_ACTION,
  displayToPagePoint,
  pageToDisplayPoint,
  usePageTransform,
  usePenSurface,
  type PenPoint,
} from './penInput'

/** Aufeinanderfolgende Striche innerhalb dieser Zeit werden zu einer Annotation gebündelt. */
const COMMIT_DELAY_MS = 800

/** EmbedPDF-Standardfarbe des Ink-Highlighters. */
const HIGHLIGHT_COLOR = '#FFCD45'

/**
 * Freihand-Zeichenfläche über einer PDF-Seite. Ersetzt EmbedPDFs Ink-Handler,
 * der Stift und Finger nicht unterscheidet und auf iPadOS Striche verliert.
 * Fertige Striche werden als reguläre Ink-Annotationen eingespeist – Undo,
 * Entwurfs-Autosave und PDF-Export laufen unverändert über das Annotation-Plugin.
 */
export function InkInputLayer({
  docId,
  pageIndex,
  tool,
}: {
  docId: string
  pageIndex: number
  tool: 'ink' | 'inkHighlighter'
}) {
  const { provides: annotationCap } = useAnnotationCapability()
  const settings = useSettings()
  const { rotation, scale } = usePageTransform(docId, pageIndex)

  const isHighlighter = tool === 'inkHighlighter'
  const strokeWidth = isHighlighter ? Math.max(8, settings.penWidth * 4) : settings.penWidth
  const strokeColor = isHighlighter ? HIGHLIGHT_COLOR : settings.penColor

  const surfaceRef = useRef<HTMLDivElement>(null)
  // Striche in unrotierten Seitenkoordinaten (Zoom 1) – die Vorschau rechnet zurück,
  // damit Zoomwechsel zwischen Strich und Commit nichts verfälschen.
  const pendingRef = useRef<Position[][]>([])
  const activeRef = useRef<Position[] | null>(null)
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const [, setTick] = useState(0)
  const rafRef = useRef(0)
  const requestRender = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      setTick((t) => t + 1)
    })
  }, [])

  const propsRef = useRef({ annotationCap, docId, pageIndex, rotation, scale, strokeWidth, strokeColor, isHighlighter })
  propsRef.current = { annotationCap, docId, pageIndex, rotation, scale, strokeWidth, strokeColor, isHighlighter }

  const commit = useCallback(() => {
    clearTimeout(commitTimer.current)
    const strokes = pendingRef.current
    pendingRef.current = []
    const { annotationCap: cap, docId: doc, pageIndex: page, strokeWidth: width, strokeColor: color, isHighlighter: hi } = propsRef.current
    const annotations = cap?.forDocument(doc)
    if (!annotations || strokes.length === 0) return
    const allPoints = strokes.flat()
    const annotation: PdfInkAnnoObject = {
      type: PdfAnnotationSubtype.INK,
      id: uuidV4(),
      created: new Date(),
      pageIndex: page,
      rect: expandRect(rectFromPoints(allPoints), width / 2),
      inkList: strokes.map((points) => ({ points })),
      strokeColor: color,
      color,
      opacity: 1,
      strokeWidth: width,
      flags: ['print'],
      ...(hi ? { intent: 'InkHighlight', blendMode: PdfBlendMode.Multiply } : {}),
    }
    annotations.createAnnotation(page, annotation)
    requestRender()
  }, [requestRender])

  const finishStroke = useCallback(() => {
    const points = activeRef.current
    activeRef.current = null
    if (points && points.length > 0) {
      // Tap ohne Bewegung ergibt einen Punkt
      pendingRef.current.push(points.length === 1 ? [points[0], points[0]] : points)
    }
    clearTimeout(commitTimer.current)
    if (pendingRef.current.length > 0) commitTimer.current = setTimeout(commit, COMMIT_DELAY_MS)
    requestRender()
  }, [commit, requestRender])

  const toPage = useCallback((p: PenPoint): Position | null => {
    const el = surfaceRef.current
    if (!el) return null
    const { rotation: rot, scale: s } = propsRef.current
    return displayToPagePoint(el, p, rot, s)
  }, [])

  usePenSurface(surfaceRef, {
    fingerDraws: settings.penFingerDraws,
    onStart: (p) => {
      clearTimeout(commitTimer.current)
      const point = toPage(p)
      activeRef.current = point ? [point] : []
      requestRender()
    },
    onMove: (pts) => {
      const stroke = activeRef.current
      if (!stroke) return
      for (const p of pts) {
        const point = toPage(p)
        if (point) stroke.push(point)
      }
      requestRender()
    },
    onEnd: finishStroke,
    onCancel: () => {
      // Abgebrochene Striche mit Substanz behalten – nichts wegwerfen, was gezeichnet wurde
      if (activeRef.current && activeRef.current.length < 2) activeRef.current = null
      finishStroke()
    },
  })

  // Beim Toolwechsel/Verlassen ausstehende Striche sofort übernehmen
  useEffect(() => {
    return () => {
      if (activeRef.current && activeRef.current.length > 0) pendingRef.current.push(activeRef.current)
      activeRef.current = null
      commit()
      cancelAnimationFrame(rafRef.current)
    }
  }, [commit])

  const el = surfaceRef.current
  const visibleStrokes = [...pendingRef.current, ...(activeRef.current ? [activeRef.current] : [])]
  const paths = el
    ? visibleStrokes
        .filter((points) => points.length > 0)
        .map((points) => {
          const display = points.map((p) => pageToDisplayPoint(el, p, rotation, scale))
          const [first, ...rest] = display
          return `M ${first.x} ${first.y}` + rest.map((p) => ` L ${p.x} ${p.y}`).join('') + (rest.length === 0 ? ` L ${first.x} ${first.y}` : '')
        })
    : []

  return (
    <div
      ref={surfaceRef}
      data-testid="ink-input-layer"
      className="absolute inset-0 z-20 cursor-crosshair select-none"
      style={{ touchAction: settings.penFingerDraws ? 'none' : PEN_SURFACE_TOUCH_ACTION }}
    >
      {paths.length > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={isHighlighter ? { mixBlendMode: 'multiply' } : undefined}
        >
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth * scale}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}
    </div>
  )
}
