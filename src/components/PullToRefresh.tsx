import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const THRESHOLD = 70

/**
 * Eigenes Pull-to-Refresh für Touch-Geräte (Browser-eigenes ist global deaktiviert).
 * Wirkt auf den nächsten scrollbaren Vorfahren (#app-scroll).
 */
export function PullToRefresh({ onRefresh }: { onRefresh: () => Promise<unknown> }) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const state = useRef({ startY: 0, active: false })

  useEffect(() => {
    const scroller = anchorRef.current?.closest('#app-scroll')
    if (!(scroller instanceof HTMLElement)) return

    function onTouchStart(event: TouchEvent) {
      if (scroller instanceof HTMLElement && scroller.scrollTop <= 0) {
        state.current = { startY: event.touches[0].clientY, active: true }
      }
    }
    function onTouchMove(event: TouchEvent) {
      if (!state.current.active) return
      const delta = event.touches[0].clientY - state.current.startY
      setPull(delta > 0 ? Math.min(delta * 0.5, THRESHOLD * 1.4) : 0)
    }
    function onTouchEnd() {
      if (!state.current.active) return
      state.current.active = false
      setPull((current) => {
        if (current >= THRESHOLD) {
          setRefreshing(true)
          navigator.vibrate?.(10)
          void onRefresh().finally(() => {
            setRefreshing(false)
            setPull(0)
          })
          return THRESHOLD
        }
        return 0
      })
    }

    scroller.addEventListener('touchstart', onTouchStart, { passive: true })
    scroller.addEventListener('touchmove', onTouchMove, { passive: true })
    scroller.addEventListener('touchend', onTouchEnd)
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchmove', onTouchMove)
      scroller.removeEventListener('touchend', onTouchEnd)
    }
  }, [onRefresh])

  return (
    <div ref={anchorRef} className="pointer-events-none relative h-0 overflow-visible">
      <div
        className="absolute inset-x-0 flex justify-center transition-transform"
        style={{ transform: `translateY(${pull - 40}px)`, opacity: pull > 8 || refreshing ? 1 : 0 }}
      >
        <span className="rounded-full border border-line bg-surface-1 p-2 shadow-md">
          <RefreshCw
            className={cn('size-5 text-accent transition-transform', refreshing && 'animate-spin')}
            style={!refreshing ? { transform: `rotate(${pull * 2.5}deg)` } : undefined}
          />
        </span>
      </div>
    </div>
  )
}
