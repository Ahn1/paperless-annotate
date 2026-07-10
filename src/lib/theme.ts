import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'system' | 'light' | 'dark' | 'amoled'
export type Accent = 'blue' | 'violet' | 'green' | 'amber'

interface ThemeState {
  mode: ThemeMode
  accent: Accent
  setMode: (mode: ThemeMode) => void
  setAccent: (accent: Accent) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      accent: 'blue',
      setMode: (mode) => set({ mode }),
      setAccent: (accent) => set({ accent }),
    }),
    { name: 'pa-theme' },
  ),
)

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')

function resolvedTheme(mode: ThemeMode): 'light' | 'dark' | 'amoled' {
  if (mode === 'system') return darkQuery.matches ? 'dark' : 'light'
  return mode
}

function apply() {
  const { mode, accent } = useThemeStore.getState()
  const theme = resolvedTheme(mode)
  const root = document.documentElement
  if (theme === 'light') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  root.setAttribute('data-accent', accent)
  // Statusleiste/Splash der PWA ans Theme anpassen
  const meta = document.querySelector('meta[name="theme-color"]')
  const bg = getComputedStyle(root).getPropertyValue('--surface').trim()
  if (meta && bg) meta.setAttribute('content', bg)
}

/** Einmalig beim App-Start aufrufen: wendet Theme an und hält es aktuell. */
export function initTheme() {
  apply()
  useThemeStore.subscribe(apply)
  darkQuery.addEventListener('change', apply)
}
