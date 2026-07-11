import { useMemo, useState } from 'react'
import { EmbedPDF } from '@embedpdf/core/react'
import { createPluginRegistration } from '@embedpdf/core'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react'
import { ViewportPluginPackage, Viewport } from '@embedpdf/plugin-viewport/react'
import { ScrollPluginPackage, Scroller } from '@embedpdf/plugin-scroll/react'
import { RenderPluginPackage, RenderLayer } from '@embedpdf/plugin-render/react'
import { ZoomPluginPackage, ZoomMode, ZoomGestureWrapper } from '@embedpdf/plugin-zoom/react'
import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import { cn } from '@/lib/utils'
import { CenteredSpinner } from '@/components/ui/misc'

/**
 * Touch-Vorschau auf EmbedPDF-Basis: iframes rendern PDFs auf iOS/Android nicht
 * brauchbar (nur erste Seite, kein Zoom). Hier: FitWidth + Pinch-Zoom-Geste.
 */
export default function PdfPreview({
  buffer,
  name,
  docKey,
  className,
}: {
  buffer: ArrayBuffer
  name: string
  docKey: string
  className?: string
}) {
  const { engine, isLoading } = usePdfiumEngine({ worker: false, wasmUrl })
  const [docId] = useState(() => docKey)

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ buffer, name, documentId: docId, autoActivate: true }],
      }),
      createPluginRegistration(ViewportPluginPackage, { viewportGap: 8 }),
      createPluginRegistration(ScrollPluginPackage, {}),
      createPluginRegistration(RenderPluginPackage, { withAnnotations: true }),
      createPluginRegistration(ZoomPluginPackage, { defaultZoomLevel: ZoomMode.FitWidth, minZoom: 0.25, maxZoom: 8 }),
    ],
    [buffer, docId, name],
  )

  if (isLoading || !engine) {
    return (
      <div className={className}>
        <CenteredSpinner />
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <EmbedPDF engine={engine} plugins={plugins}>
        <Viewport documentId={docId} className="absolute inset-0 overflow-auto">
          <ZoomGestureWrapper documentId={docId}>
            <Scroller
              documentId={docId}
              renderPage={(page) => <RenderLayer documentId={docId} pageIndex={page.pageIndex} />}
            />
          </ZoomGestureWrapper>
        </Viewport>
      </EmbedPDF>
    </div>
  )
}
