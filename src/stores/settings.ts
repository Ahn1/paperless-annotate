import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type DocumentViewMode = 'cards' | 'list' | 'table'

interface SettingsState {
  viewMode: DocumentViewMode
  pageSize: number
  penFingerDraws: boolean
  penPressure: boolean
  penColor: string
  penWidth: number
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
      penColor: '#e03131',
      penWidth: 2.5,
      setViewMode: (viewMode) => set({ viewMode }),
      set: (partial) => set(partial),
    }),
    { name: 'pa-settings' },
  ),
)
