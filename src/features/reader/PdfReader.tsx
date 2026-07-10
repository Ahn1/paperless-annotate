import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmbedPDF } from '@embedpdf/core/react'
import { createPluginRegistration } from '@embedpdf/core'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react'
import { ViewportPluginPackage, Viewport, useViewportCapability } from '@embedpdf/plugin-viewport/react'
import { ScrollPluginPackage, Scroller, useScroll } from '@embedpdf/plugin-scroll/react'
import { RenderPluginPackage, RenderLayer } from '@embedpdf/plugin-render/react'
import { ZoomPluginPackage, ZoomMode, useZoom } from '@embedpdf/plugin-zoom/react'
import { ThumbnailPluginPackage } from '@embedpdf/plugin-thumbnail/react'
import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import { ArrowLeft, PanelLeft, ZoomIn, ZoomOut } from 'lucide-react'
import type { PaperlessDocument } from '@/api/types'
import { useT } from '@/lib/i18n'
import { useSettings } from '@/stores/settings'
import { useSession } from '@/stores/session'
import { positionStore } from '@/lib/db'
import { CenteredSpinner } from '@/components/ui/misc'
import { ThumbnailsDrawer } from '@/features/editor/ThumbnailsDrawer'

/**
 * Lesemodus: schlanker Vollbild-Viewer auf EmbedPDF-Basis (ohne Annotation-Werkzeuge).
 * Bewusst kein iframe: nur so lässt sich die Scroll-Position lesen/wiederherstellen.
 */
export default function PdfReader({
  document,
  versionId,
  buffer,
}: {
  document: PaperlessDocument
  versionId: number | undefined
  buffer: ArrayBuffer
}) {
  const { engine, isLoading } = usePdfiumEngine({ worker: false, wasmUrl })
  const [docId] = useState(() => `read-${document.id}-${versionId ?? 'current'}`)

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ buffer, name: document.title || 'document.pdf', documentId: docId, autoActivate: true }],
      }),
      createPluginRegistration(ViewportPluginPackage, { viewportGap: 8 }),
      createPluginRegistration(ScrollPluginPackage, {}),
      // Im Lesemodus sollen vorhandene Annotationen sichtbar sein → mit ins Seitenraster rendern
      createPluginRegistration(RenderPluginPackage, { withAnnotations: true }),
      createPluginRegistration(ZoomPluginPackage, { defaultZoomLevel: ZoomMode.FitWidth, minZoom: 0.25, maxZoom: 8 }),
      createPluginRegistration(ThumbnailPluginPackage, { width: 110, gap: 10 }),
    ],
    [buffer, docId, document.title],
  )

  if (isLoading || !engine) {
    return (
      <div className="flex h-dvh items-center justify-center bg-surface">
        <CenteredSpinner />
      </div>
    )
  }

  return (
    <EmbedPDF engine={engine} plugins={plugins}>
      <ReaderInner docId={docId} document={document} versionId={versionId} />
    </EmbedPDF>
  )
}

function ReaderInner({
  docId,
  document: paperlessDocument,
  versionId,
}: {
  docId: string
  document: PaperlessDocument
  versionId: number | undefined
}) {
  const t = useT()
  const navigate = useNavigate()
  const rememberPosition = useSettings((s) => s.rememberPdfPosition)
  const profileId = useSession((s) => s.activeProfile?.id ?? 'default')

  const { provides: viewportCap } = useViewportCapability()
  const { provides: zoom, state: zoomState } = useZoom(docId)
  const { state: scrollState } = useScroll(docId)

  const [thumbsOpen, setThumbsOpen] = useState(false)
  const [restoredHint, setRestoredHint] = useState(false)

  const positionKey = positionStore.key(profileId, paperlessDocument.id, versionId ?? null)
  const restored = useRef(false)
  const latestMetrics = useRef({ scrollTop: 0, scrollLeft: 0 })
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const viewport = viewportCap?.forDocument(docId) ?? null

  // ---------- Position fortlaufend merken (debounced) ----------
  useEffect(() => {
    if (!viewport || !rememberPosition) return
    const off = viewport.onScrollChange((metrics) => {
      latestMetrics.current = { scrollTop: metrics.scrollTop, scrollLeft: metrics.scrollLeft }
      if (!restored.current) return // nicht speichern, bevor die alte Position wiederhergestellt wurde
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        void positionStore.put({
          key: positionKey,
          scrollTop: latestMetrics.current.scrollTop,
          scrollLeft: latestMetrics.current.scrollLeft,
          zoom: zoomState?.currentZoomLevel ?? null,
          updatedAt: new Date().toISOString(),
        })
      }, 800)
    })
    return () => {
      clearTimeout(saveTimer.current)
      off?.()
    }
  }, [viewport, rememberPosition, positionKey, zoomState?.currentZoomLevel])

  // ---------- Gespeicherte Position wiederherstellen (sobald Layout steht) ----------
  const layoutReady = (scrollState?.totalPages ?? 0) > 0
  useEffect(() => {
    if (!viewport || !layoutReady || restored.current) return
    if (!rememberPosition) {
      restored.current = true
      return
    }
    void positionStore.get(positionKey).then((position) => {
      // kleiner Aufschub, bis FitWidth-Zoom und Seitenlayout angewendet sind
      setTimeout(() => {
        if (position && position.scrollTop > 4) {
          if (position.zoom && zoom) zoom.requestZoom(position.zoom)
          viewport.scrollTo({ x: position.scrollLeft, y: position.scrollTop, behavior: 'auto' })
          setRestoredHint(true)
          setTimeout(() => setRestoredHint(false), 2500)
        }
        restored.current = true
      }, 150)
    })
  }, [viewport, layoutReady, rememberPosition, positionKey, zoom])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Schmale Kopfleiste */}
      <div className="ui-chrome flex items-center gap-1 border-b border-line bg-surface-1 px-2 py-1.5 pt-safe">
        <button
          onClick={() => navigate(`/documents/${paperlessDocument.id}`)}
          title={t('common.back')}
          aria-label={t('common.back')}
          className="rounded-lg p-2 text-ink-muted hover:bg-surface-2"
        >
          <ArrowLeft className="size-5" />
        </button>
        <button
          onClick={() => setThumbsOpen((open) => !open)}
          title={t('editor.thumbnails')}
          aria-label={t('editor.thumbnails')}
          className="rounded-lg p-2 text-ink-muted hover:bg-surface-2"
        >
          <PanelLeft className="size-5" />
        </button>
        <span className="mx-2 min-w-0 flex-1 truncate text-sm font-medium text-ink">{paperlessDocument.title}</span>
        {scrollState && scrollState.totalPages > 0 && (
          <span className="mr-1 shrink-0 text-xs tabular-nums text-ink-faint">
            {scrollState.currentPage} / {scrollState.totalPages}
          </span>
        )}
        <button
          onClick={() => zoom?.zoomOut()}
          title={t('editor.zoomOut')}
          aria-label={t('editor.zoomOut')}
          className="rounded-lg p-2 text-ink-muted hover:bg-surface-2"
        >
          <ZoomOut className="size-5" />
        </button>
        <button
          onClick={() => zoom?.zoomIn()}
          title={t('editor.zoomIn')}
          aria-label={t('editor.zoomIn')}
          className="rounded-lg p-2 text-ink-muted hover:bg-surface-2"
        >
          <ZoomIn className="size-5" />
        </button>
      </div>

      {restoredHint && (
        <div className="ui-chrome pointer-events-none absolute inset-x-0 top-16 z-10 flex justify-center">
          <span className="rounded-full border border-line bg-surface-1/95 px-3 py-1.5 text-xs font-medium text-ink-muted shadow-md animate-fade-in">
            {t('reader.positionRestored')}
          </span>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <ThumbnailsDrawer docId={docId} open={thumbsOpen} />
        <div className="relative min-w-0 flex-1">
          <Viewport documentId={docId} className="absolute inset-0 overflow-auto bg-surface-2">
            <Scroller
              documentId={docId}
              renderPage={(page) => <RenderLayer documentId={docId} pageIndex={page.pageIndex} />}
            />
          </Viewport>
        </div>
      </div>
    </div>
  )
}
