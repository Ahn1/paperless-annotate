import { ThumbnailsPane, ThumbImg, useThumbnailCapability } from '@embedpdf/plugin-thumbnail/react'
import { useScroll } from '@embedpdf/plugin-scroll/react'
import { cn } from '@/lib/utils'

/** Daumenkino-Leiste links im Editor. */
export function ThumbnailsDrawer({ docId, open }: { docId: string; open: boolean }) {
  const { provides: thumbnailCap } = useThumbnailCapability()
  const { provides: scroll, state: scrollState } = useScroll(docId)

  if (!open) return null

  return (
    <aside className="ui-chrome w-36 shrink-0 border-r border-line bg-surface-1">
      <ThumbnailsPane documentId={docId} style={{ height: '100%' }}>
        {(meta) => (
          <button
            key={meta.pageIndex}
            style={{ position: 'absolute', top: meta.top, height: meta.wrapperHeight, width: '100%' }}
            className="flex flex-col items-center gap-1 px-2"
            onClick={() => {
              scroll?.scrollToPage({ pageNumber: meta.pageIndex + 1 })
              thumbnailCap?.forDocument?.(docId)
            }}
          >
            <span
              className={cn(
                'overflow-hidden rounded-lg border-2',
                scrollState?.currentPage === meta.pageIndex + 1 ? 'border-accent' : 'border-line',
              )}
            >
              <ThumbImg documentId={docId} meta={meta} />
            </span>
            <span className="text-[10px] text-ink-faint">{meta.pageIndex + 1}</span>
          </button>
        )}
      </ThumbnailsPane>
    </aside>
  )
}
