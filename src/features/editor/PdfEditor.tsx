import { useMemo, useState } from 'react'
import { EmbedPDF } from '@embedpdf/core/react'
import { createPluginRegistration } from '@embedpdf/core'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager/react'
import { ViewportPluginPackage, Viewport } from '@embedpdf/plugin-viewport/react'
import { ScrollPluginPackage, Scroller } from '@embedpdf/plugin-scroll/react'
import { RenderPluginPackage, RenderLayer } from '@embedpdf/plugin-render/react'
import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom/react'
import {
  InteractionManagerPluginPackage,
  GlobalPointerProvider,
  PagePointerProvider,
} from '@embedpdf/plugin-interaction-manager/react'
import { SelectionPluginPackage, SelectionLayer } from '@embedpdf/plugin-selection/react'
import { HistoryPluginPackage } from '@embedpdf/plugin-history/react'
import { AnnotationPluginPackage, AnnotationLayer } from '@embedpdf/plugin-annotation/react'
import { ExportPluginPackage } from '@embedpdf/plugin-export/react'
import { ThumbnailPluginPackage } from '@embedpdf/plugin-thumbnail/react'
import wasmUrl from '@embedpdf/pdfium/pdfium.wasm?url'
import type { PaperlessDocument } from '@/api/types'
import { CenteredSpinner } from '@/components/ui/misc'
import { EditorInner } from './EditorInner'

export type EditorToolId = 'select' | 'ink' | 'inkHighlighter' | 'highlight' | 'freeText' | 'eraser'

export default function PdfEditor({
  document,
  versionId,
  buffer,
}: {
  document: PaperlessDocument
  versionId: number | undefined
  buffer: ArrayBuffer
}) {
  // PDFium mit lokal gebundeltem WASM (offlinefähig, kein CDN).
  // Hinweis: worker:true hängt in 2.14.4 (WASM wird im Worker nie geladen, siehe plan.md Kap. 12/M5),
  // daher läuft die Engine im Main-Thread.
  const { engine, isLoading } = usePdfiumEngine({ worker: false, wasmUrl })
  const [docId] = useState(() => `paperless-${document.id}-${versionId ?? 'current'}`)

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [
          {
            buffer,
            name: document.title || 'document.pdf',
            documentId: docId,
            autoActivate: true,
          },
        ],
      }),
      createPluginRegistration(ViewportPluginPackage, { viewportGap: 8 }),
      createPluginRegistration(ScrollPluginPackage, {}),
      // Annotationen nicht ins Seitenraster einbacken – sie leben editierbar im AnnotationLayer
      createPluginRegistration(RenderPluginPackage, { withAnnotations: false }),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitWidth,
        minZoom: 0.25,
        maxZoom: 8,
      }),
      createPluginRegistration(InteractionManagerPluginPackage, {}),
      createPluginRegistration(SelectionPluginPackage, {}),
      createPluginRegistration(HistoryPluginPackage, {}),
      createPluginRegistration(AnnotationPluginPackage, {
        autoCommit: true,
        annotationAuthor: 'Paperless Annotator',
        selectAfterCreate: false,
      }),
      createPluginRegistration(ExportPluginPackage, { defaultFileName: `${document.title}.pdf` }),
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
      <EditorInner docId={docId} document={document} versionId={versionId} />
    </EmbedPDF>
  )
}

/** Gemeinsame Seitenebenen für den Editor. */
export function EditorPageLayers({
  docId,
  pageIndex,
  children,
}: {
  docId: string
  pageIndex: number
  children?: React.ReactNode
}) {
  return (
    <PagePointerProvider documentId={docId} pageIndex={pageIndex}>
      <RenderLayer documentId={docId} pageIndex={pageIndex} />
      <SelectionLayer documentId={docId} pageIndex={pageIndex} />
      <AnnotationLayer documentId={docId} pageIndex={pageIndex} />
      {children}
    </PagePointerProvider>
  )
}

export { Viewport, Scroller, GlobalPointerProvider }
