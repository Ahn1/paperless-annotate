import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAnnotationCapability } from '@embedpdf/plugin-annotation/react'
import { useInteractionManagerCapability } from '@embedpdf/plugin-interaction-manager/react'
import { useHistoryCapability } from '@embedpdf/plugin-history/react'
import { useZoom } from '@embedpdf/plugin-zoom/react'
import type { AnnotationTransferItem } from '@embedpdf/plugin-annotation'
import type { PaperlessDocument } from '@/api/types'
import { useT } from '@/lib/i18n'
import { useSettings } from '@/stores/settings'
import { useSession } from '@/stores/session'
import { draftStore } from '@/lib/db'
import { Button } from '@/components/ui/Button'
import { EditorPageLayers, GlobalPointerProvider, Scroller, Viewport, type EditorToolId } from './PdfEditor'
import { EditorToolbar } from './EditorToolbar'
import { EraserLayer } from './EraserLayer'
import { SaveVersionDialog } from './SaveVersionDialog'
import { ThumbnailsDrawer } from './ThumbnailsDrawer'

export function EditorInner({
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
  const settings = useSettings()
  const profileId = useSession((s) => s.activeProfile?.id ?? 'default')

  const { provides: annotationCap } = useAnnotationCapability()
  const { provides: interactionCap } = useInteractionManagerCapability()
  const { provides: historyCap } = useHistoryCapability()
  const { provides: zoom } = useZoom(docId)

  const annotations = annotationCap?.forDocument(docId) ?? null
  const history = historyCap?.forDocument(docId) ?? null

  const [activeTool, setActiveToolState] = useState<EditorToolId>('select')
  const [thumbsOpen, setThumbsOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [draftAvailable, setDraftAvailable] = useState(false)

  // ---------- Palm Rejection: Zeichenmodi nur für den Stift, Finger scrollt ----------
  // wantsRawTouch=false → Touch-Events bleiben beim Browser (Scrollen/Zoomen), der Stift zeichnet.
  useEffect(() => {
    if (!interactionCap) return
    const raw = settings.penFingerDraws
    for (const modeId of ['ink', 'inkHighlighter']) {
      interactionCap.registerMode({
        id: modeId,
        scope: 'page',
        exclusive: true,
        cursor: 'crosshair',
        wantsRawTouch: raw,
      })
    }
    // Aktiven Zeichenmodus neu aktivieren, damit die Änderung greift
    if (activeTool === 'ink' || activeTool === 'inkHighlighter') {
      annotations?.setActiveTool(null)
      annotations?.setActiveTool(activeTool)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionCap, settings.penFingerDraws])

  // ---------- Werkzeug-Umschaltung ----------
  const setTool = useCallback(
    (tool: EditorToolId) => {
      setActiveToolState(tool)
      if (!annotations) return
      if (tool === 'select' || tool === 'eraser') {
        annotations.setActiveTool(null)
      } else {
        annotations.setActiveTool(tool)
      }
    },
    [annotations],
  )

  // Stift-Einstellungen live auf die Tools anwenden (Tool-Defaults sind global)
  useEffect(() => {
    if (!annotationCap) return
    annotationCap.setToolDefaults('ink', {
      strokeColor: settings.penColor,
      strokeWidth: settings.penWidth,
      opacity: 1,
    })
    annotationCap.setToolDefaults('inkHighlighter', {
      strokeWidth: Math.max(8, settings.penWidth * 4),
    })
  }, [annotationCap, settings.penColor, settings.penWidth])

  // ---------- Entwurfsschutz (Autosave in IndexedDB) ----------
  const draftKey = draftStore.key(profileId, paperlessDocument.id, versionId ?? null)
  const sessionIds = useRef<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const persistDraft = useCallback(() => {
    if (!annotations) return
    annotations.exportAnnotations().wait(
      (items: AnnotationTransferItem[]) => {
        const own = items.filter((item) => sessionIds.current.has(item.annotation.id))
        if (own.length === 0) {
          void draftStore.del(draftKey)
        } else {
          void draftStore.put({
            key: draftKey,
            profileId,
            documentId: paperlessDocument.id,
            versionId: versionId ?? null,
            updatedAt: new Date().toISOString(),
            payload: own,
          })
        }
      },
      () => undefined,
    )
  }, [annotations, draftKey, profileId, paperlessDocument.id, versionId])

  const scheduleDraftSave = useCallback(() => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(persistDraft, 3000)
  }, [persistDraft])

  useEffect(() => {
    if (!annotations) return
    const off = annotations.onAnnotationEvent((event) => {
      if (event.type === 'create') sessionIds.current.add(event.annotation.id)
      if (event.type === 'delete') sessionIds.current.delete(event.annotation.id)
      if (event.type === 'create' || event.type === 'update' || event.type === 'delete') {
        setDirty(sessionIds.current.size > 0)
        scheduleDraftSave()
      }
    })
    return off
  }, [annotations, scheduleDraftSave])

  // Autosave alle 30 s + beim Verlassen/Ausblenden
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionIds.current.size > 0) persistDraft()
    }, 30_000)
    const onHide = () => {
      if (sessionIds.current.size > 0) persistDraft()
    }
    window.document.addEventListener('visibilitychange', onHide)
    window.addEventListener('beforeunload', onHide)
    return () => {
      clearInterval(interval)
      window.document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('beforeunload', onHide)
      clearTimeout(saveTimer.current)
    }
  }, [persistDraft])

  // Vorhandenen Entwurf erkennen
  useEffect(() => {
    void draftStore.get(draftKey).then((draft) => {
      const payload = draft?.payload as AnnotationTransferItem[] | undefined
      if (payload?.length) setDraftAvailable(true)
    })
  }, [draftKey])

  async function restoreDraft() {
    if (!annotations) return
    const draft = await draftStore.get(draftKey)
    const items = (draft?.payload as AnnotationTransferItem[] | undefined) ?? []
    annotations.importAnnotations(items)
    for (const item of items) sessionIds.current.add(item.annotation.id)
    setDirty(items.length > 0)
    setDraftAvailable(false)
  }

  async function discardDraft() {
    await draftStore.del(draftKey)
    setDraftAvailable(false)
  }

  // ---------- Verlassen ----------
  function exit() {
    if (dirty && !window.confirm(t('editor.unsavedLeave'))) return
    if (dirty) persistDraft()
    navigate(`/documents/${paperlessDocument.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      <EditorToolbar
        activeTool={activeTool}
        onToolChange={setTool}
        onUndo={() => history?.undo()}
        onRedo={() => history?.redo()}
        history={history}
        onZoomIn={() => zoom?.zoomIn()}
        onZoomOut={() => zoom?.zoomOut()}
        onToggleThumbs={() => setThumbsOpen((open) => !open)}
        onSave={() => setSaveOpen(true)}
        onExit={exit}
        dirty={dirty}
        title={paperlessDocument.title}
      />

      {/* Entwurfs-Hinweis */}
      {draftAvailable && (
        <div className="ui-chrome flex flex-wrap items-center justify-center gap-2 border-b border-line bg-accent-soft px-3 py-2 text-sm text-ink">
          {t('editor.draftFound')}
          <Button size="sm" onClick={() => void restoreDraft()}>
            {t('editor.draftRestore')}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void discardDraft()}>
            {t('editor.draftDiscard')}
          </Button>
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <ThumbnailsDrawer docId={docId} open={thumbsOpen} />
        <div className="relative min-w-0 flex-1">
          <GlobalPointerProvider documentId={docId}>
            <Viewport documentId={docId} className="absolute inset-0 overflow-auto bg-surface-2">
              <Scroller
                documentId={docId}
                renderPage={(page) => (
                  <EditorPageLayers docId={docId} pageIndex={page.pageIndex}>
                    {activeTool === 'eraser' && <EraserLayer docId={docId} pageIndex={page.pageIndex} />}
                  </EditorPageLayers>
                )}
              />
            </Viewport>
          </GlobalPointerProvider>
        </div>
      </div>

      {saveOpen && (
        <SaveVersionDialog
          docId={docId}
          document={paperlessDocument}
          onClose={() => setSaveOpen(false)}
          onUploaded={async () => {
            sessionIds.current.clear()
            setDirty(false)
            await draftStore.del(draftKey)
            navigate(`/documents/${paperlessDocument.root_document ?? paperlessDocument.id}`)
          }}
        />
      )}
    </div>
  )
}
