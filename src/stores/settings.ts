import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SmoothingLevel } from '@/features/editor/inkSmoothing'

export type DocumentViewMode = 'cards' | 'list' | 'table'

interface SettingsState {
  viewMode: DocumentViewMode
  pageSize: number
  penFingerDraws: boolean
  penPressure: boolean
  /** Wie stark die App Stiftstriche abrundet. */
  penSmoothing: SmoothingLevel
  penColor: string
  penWidth: number
  /** Lesemodus: Scroll-Position pro Dokument lokal merken und wiederherstellen. */
  rememberPdfPosition: boolean
  setViewMode: (mode: DocumentViewMode) => void
  set: (partial: Partial<SettingsState>) => void
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      viewMode: 'cards',
      pageSize: 50,
      penFingerDraws: false,
      penPressure: true,
      penSmoothing: 'light',
      penColor: '#e03131',
      penWidth: 2.5,
      rememberPdfPosition: true,
      setViewMode: (viewMode) => set({ viewMode }),
      set: (partial) => set(partial),
    }),
    { name: 'pa-settings' },
  ),
)
