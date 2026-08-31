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
import { smoothStroke } from './inkSmoothing'
import { groupStrokesByWidth, strokeWidthForPressure, type SizedStroke } from './penPressure'
import {
  PEN_SURFACE_TOUCH_ACTION,
  displayToPagePoint,
  pageToLocalPoint,
  usePageTransform,
  usePenSurface,
  type PenPoint,
} from './penInput'

/** Aufeinanderfolgende Striche innerhalb dieser Zeit werden zu einer Annotation gebündelt. */
const COMMIT_DELAY_MS = 800

/** EmbedPDF-Standardfarbe des Ink-Highlighters. */
const HIGHLIGHT_COLOR = '#FFCD45'

/** Ein Strich der Vorschau: fertiger SVG-Pfad plus seine Stärke in Seitenkoordinaten. */
interface PreviewPath {
  d: string
  width: number
}

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
  const smoothing = settings.penSmoothing
  // Der Marker soll gleichmäßig decken, deshalb wirkt der Druck nur auf den Stift.
  const pressureEnabled = settings.penPressure && !isHighlighter

  const surfaceRef = useRef<HTMLDivElement>(null)
  // Striche in unrotierten Seitenkoordinaten (Zoom 1) – die Vorschau rechnet zurück,
  // damit Zoomwechsel zwischen Strich und Commit nichts verfälschen.
  // Fertige Striche liegen hier bereits geglättet, mit ihrer endgültigen Stärke.
  const pendingRef = useRef<SizedStroke<Position>[]>([])
  const activeRef = useRef<Position[] | null>(null)
  const activePressuresRef = useRef<number[]>([])
  const commitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Fertige Striche ändern sich nicht mehr. Ihre Pfade werden einmal berechnet und
  // erst bei Zoom- oder Größenwechsel verworfen – pro Bild bleibt nur der
  // aktive Strich zu rechnen.
  const pathCache = useRef<{ key: string; paths: PreviewPath[] }>({ key: '', paths: [] })

  const [, setTick] = useState(0)
  const rafRef = useRef(0)
  const requestRender = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      setTick((t) => t + 1)
    })
  }, [])

  const propsRef = useRef({
    annotationCap,
    docId,
    pageIndex,
    rotation,
    scale,
    strokeWidth,
    strokeColor,
    isHighlighter,
    smoothing,
    pressureEnabled,
  })
  propsRef.current = {
    annotationCap,
    docId,
    pageIndex,
    rotation,
    scale,
    strokeWidth,
    strokeColor,
    isHighlighter,
    smoothing,
    pressureEnabled,
  }

  const commit = useCallback(() => {
    clearTimeout(commitTimer.current)
    const strokes = pendingRef.current
    pendingRef.current = []
    pathCache.current = { key: '', paths: [] }
    const { annotationCap: cap, docId: doc, pageIndex: page, strokeColor: color, isHighlighter: hi } = propsRef.current
    const annotations = cap?.forDocument(doc)
    if (!annotations || strokes.length === 0) return
    // Eine Ink-Annotation trägt genau eine Strichstärke, deshalb je Stärke eine Annotation.
    for (const group of groupStrokesByWidth(strokes)) {
      const annotation: PdfInkAnnoObject = {
        type: PdfAnnotationSubtype.INK,
        id: uuidV4(),
        created: new Date(),
        pageIndex: page,
        rect: expandRect(rectFromPoints(group.strokes.flat()), group.width / 2),
        inkList: group.strokes.map((points) => ({ points })),
        strokeColor: color,
        color,
        opacity: 1,
        strokeWidth: group.width,
        flags: ['print'],
        ...(hi ? { intent: 'InkHighlight', blendMode: PdfBlendMode.Multiply } : {}),
      }
      annotations.createAnnotation(page, annotation)
    }
    requestRender()
  }, [requestRender])

  const finishStroke = useCallback(
    (immediate = false) => {
      const raw = activeRef.current
      const pressures = activePressuresRef.current
      activeRef.current = null
      activePressuresRef.current = []
      if (raw && raw.length > 0) {
        const { smoothing: level, strokeWidth: base, pressureEnabled: withPressure } = propsRef.current
        const smoothed = smoothStroke(raw, level)
        pendingRef.current.push({
          // Tap ohne Bewegung ergibt einen Punkt
          points: smoothed.length === 1 ? [smoothed[0], smoothed[0]] : smoothed,
          width: withPressure ? strokeWidthForPressure(pressures, base) : base,
        })
      }
      clearTimeout(commitTimer.current)
      if (pendingRef.current.length > 0) {
        if (immediate) commit()
        else commitTimer.current = setTimeout(commit, COMMIT_DELAY_MS)
      }
      requestRender()
    },
    [commit, requestRender],
  )

  const addPoint = useCallback((p: PenPoint) => {
    const el = surfaceRef.current
    const stroke = activeRef.current
    if (!el || !stroke) return
    const { rotation: rot, scale: s } = propsRef.current
    stroke.push(displayToPagePoint(el, p, rot, s))
    if (p.pressure !== undefined) activePressuresRef.current.push(p.pressure)
  }, [])

  usePenSurface(surfaceRef, {
    fingerDraws: settings.penFingerDraws,
    onStart: (p) => {
      clearTimeout(commitTimer.current)
      activeRef.current = []
      activePressuresRef.current = []
      addPoint(p)
      requestRender()
    },
    onMove: (pts) => {
      if (!activeRef.current) return
      for (const p of pts) addPoint(p)
      requestRender()
    },
    onEnd: () => finishStroke(),
    onCancel: () => {
      // Abgebrochene Striche mit Substanz behalten – nichts wegwerfen, was gezeichnet wurde
      if (activeRef.current && activeRef.current.length < 2) activeRef.current = null
      finishStroke()
    },
  })

  // Beim Toolwechsel/Verlassen ausstehende Striche sofort übernehmen
  const finishRef = useRef(finishStroke)
  finishRef.current = finishStroke
  useEffect(() => {
    return () => {
      finishRef.current(true)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const el = surfaceRef.current
  const paths: PreviewPath[] = []
  if (el) {
    const cache = pathCache.current
    const key = `${scale}|${el.clientWidth}x${el.clientHeight}`
    if (cache.key !== key) {
      cache.key = key
      cache.paths = []
    }
    if (cache.paths.length > pendingRef.current.length) cache.paths.length = pendingRef.current.length
    while (cache.paths.length < pendingRef.current.length) {
      const stroke = pendingRef.current[cache.paths.length]
      cache.paths.push({ d: strokePath(stroke.points, scale), width: stroke.width })
    }
    paths.push(...cache.paths)

    const active = activeRef.current
    if (active && active.length > 0) {
      // Vorschau und abgelegter Strich durchlaufen dieselbe Glättung, damit beim
      // Absetzen nichts springt.
      paths.push({
        d: strokePath(smoothStroke(active, smoothing), scale),
        width: pressureEnabled ? strokeWidthForPressure(activePressuresRef.current, strokeWidth) : strokeWidth,
      })
    }
  }

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
          {paths.map((path, i) => (
            <path
              key={i}
              d={path.d}
              fill="none"
              stroke={strokeColor}
              strokeWidth={path.width * scale}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      )}
    </div>
  )
}

/** Zeichnet einen Strich als SVG-Pfad im lokalen Raum der Zeichenfläche. */
function strokePath(points: Position[], scale: number): string {
  const display = points.map((p) => pageToLocalPoint(p, scale))
  const [first, ...rest] = display
  return (
    `M ${first.x} ${first.y}` +
    rest.map((p) => ` L ${p.x} ${p.y}`).join('') +
    (rest.length === 0 ? ` L ${first.x} ${first.y}` : '')
  )
}
