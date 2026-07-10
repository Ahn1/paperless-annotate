import { create } from 'zustand'

/** Chromium-only Event, das den nativen PWA-Install-Dialog aufschiebt (nicht in lib.dom typisiert). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PwaInstallState {
  /** true, sobald der Browser beforeinstallprompt geliefert hat und wir ihn manuell auslösen können. */
  canInstall: boolean
  /** true, wenn die App bereits als PWA läuft oder in dieser Sitzung installiert wurde. */
  installed: boolean
  /** Öffnet den nativen Install-Dialog. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null

export const usePwaInstall = create<PwaInstallState>()((set) => ({
  canInstall: false,
  installed:
    typeof window !== 'undefined' &&
    (window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)),
  promptInstall: async () => {
    if (!deferredPrompt) return 'unavailable'
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    // Das Event ist nach prompt() verbraucht; der Browser feuert bei Bedarf ein neues.
    deferredPrompt = null
    if (outcome === 'accepted') set({ canInstall: false, installed: true })
    else set({ canInstall: false })
    return outcome
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    usePwaInstall.setState({ canInstall: true })
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    usePwaInstall.setState({ canInstall: false, installed: true })
  })
}
