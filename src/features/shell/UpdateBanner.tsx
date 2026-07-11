import { useRegisterSW } from 'virtual:pwa-register/react'
import { RefreshCw, X } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/Button'

const CHECK_INTERVAL = 30 * 60 * 1000

/**
 * PWA-Update-Flow (registerType: 'prompt' in vite.config.ts): prüft beim Start,
 * bei Rückkehr in die App und alle 30 Minuten auf eine neue Version. Gibt es eine,
 * erscheint ein Banner – erst der Button aktiviert den neuen Service Worker und
 * lädt neu, es gibt keinen ungefragten Reload.
 */
export function UpdateBanner() {
  const t = useT()
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) void registration.update()
      }
      // Banner lebt so lange wie die App → Listener brauchen kein Cleanup
      setInterval(check, CHECK_INTERVAL)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  if (!needRefresh) return null

  return (
    <div className="ui-chrome pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 pb-safe sm:bottom-4">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-line bg-surface-1 py-2.5 pl-4 pr-2 shadow-xl">
        <RefreshCw className="size-4 shrink-0 text-accent" />
        <p className="text-sm font-medium text-ink">{t('update.available')}</p>
        <Button size="sm" onClick={() => void updateServiceWorker(true)}>
          {t('update.reload')}
        </Button>
        <button
          onClick={() => setNeedRefresh(false)}
          aria-label={t('common.close')}
          className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-2"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
