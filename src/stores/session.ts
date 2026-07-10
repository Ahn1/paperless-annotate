import { create } from 'zustand'
import { PaperlessClient } from '@/api/client'
import { createApi, type PaperlessApi } from '@/api/paperless'
import { kv, profileStore, type ServerProfile } from '@/lib/db'
import { decryptToken, encryptToken } from '@/lib/crypto'

const ACTIVE_PROFILE_KEY = 'activeProfileId'

export type SessionStatus =
  | 'loading' // App-Start, Profile werden geladen
  | 'no-profile' // kein Profil vorhanden → Onboarding
  | 'locked' // PIN-geschütztes Profil, PIN erforderlich
  | 'ready' // API einsatzbereit

interface SessionState {
  status: SessionStatus
  profiles: ServerProfile[]
  activeProfile: ServerProfile | null
  api: PaperlessApi | null
  /** true nach 401 → Login-Hinweis anzeigen */
  authError: boolean
  /** Entschlüsseltes Token des aktiven Profils (nur im Speicher, nie persistiert). */
  unlockedToken: string | null
  init: () => Promise<void>
  addProfile: (profile: ServerProfile) => Promise<void>
  removeProfile: (id: string) => Promise<void>
  switchProfile: (id: string) => Promise<void>
  unlock: (pin: string) => Promise<boolean>
  /** Token des aktiven Profils mit PIN verschlüsseln. */
  enablePin: (pin: string) => Promise<void>
  /** PIN-Schutz des aktiven Profils entfernen (Profil muss entsperrt sein). */
  disablePin: () => Promise<void>
}

function buildApi(profile: ServerProfile, token: string, onUnauthorized: () => void): PaperlessApi {
  const client = new PaperlessClient(profile.baseUrl, token)
  client.onUnauthorized = onUnauthorized
  return createApi(client)
}

export const useSession = create<SessionState>()((set, get) => {
  const onUnauthorized = () => set({ authError: true })

  async function activate(profile: ServerProfile) {
    if (profile.encrypted) {
      set({ activeProfile: profile, api: null, status: 'locked', authError: false, unlockedToken: null })
      return
    }
    set({
      activeProfile: profile,
      api: buildApi(profile, profile.token, onUnauthorized),
      status: 'ready',
      authError: false,
      unlockedToken: profile.token,
    })
  }

  return {
    status: 'loading',
    profiles: [],
    activeProfile: null,
    api: null,
    authError: false,
    unlockedToken: null,

    async init() {
      const profiles = await profileStore.all()
      set({ profiles })
      if (profiles.length === 0) {
        set({ status: 'no-profile' })
        return
      }
      const activeId = await kv.get<string>(ACTIVE_PROFILE_KEY)
      const profile = profiles.find((p) => p.id === activeId) ?? profiles[0]
      await kv.set(ACTIVE_PROFILE_KEY, profile.id)
      await activate(profile)
    },

    async addProfile(profile) {
      await profileStore.put(profile)
      await kv.set(ACTIVE_PROFILE_KEY, profile.id)
      set({ profiles: [...get().profiles.filter((p) => p.id !== profile.id), profile] })
      await activate(profile)
    },

    async removeProfile(id) {
      await profileStore.del(id)
      const profiles = get().profiles.filter((p) => p.id !== id)
      set({ profiles })
      if (get().activeProfile?.id === id) {
        if (profiles.length > 0) {
          await kv.set(ACTIVE_PROFILE_KEY, profiles[0].id)
          await activate(profiles[0])
        } else {
          await kv.del(ACTIVE_PROFILE_KEY)
          set({ activeProfile: null, api: null, status: 'no-profile' })
        }
      }
    },

    async switchProfile(id) {
      const profile = get().profiles.find((p) => p.id === id)
      if (!profile) return
      await kv.set(ACTIVE_PROFILE_KEY, id)
      await activate(profile)
    },

    async unlock(pin) {
      const profile = get().activeProfile
      if (!profile?.encrypted) return false
      try {
        const token = await decryptToken(profile.token, pin, profile.encrypted.salt, profile.encrypted.iv)
        set({ api: buildApi(profile, token, onUnauthorized), status: 'ready', authError: false, unlockedToken: token })
        return true
      } catch {
        return false
      }
    },

    async enablePin(pin) {
      const { activeProfile, unlockedToken } = get()
      if (!activeProfile || !unlockedToken) return
      const { cipher, salt, iv } = await encryptToken(unlockedToken, pin)
      const updated: ServerProfile = { ...activeProfile, token: cipher, encrypted: { salt, iv } }
      await profileStore.put(updated)
      set({
        activeProfile: updated,
        profiles: get().profiles.map((p) => (p.id === updated.id ? updated : p)),
      })
    },

    async disablePin() {
      const { activeProfile, unlockedToken } = get()
      if (!activeProfile || !unlockedToken) return
      const updated: ServerProfile = { ...activeProfile, token: unlockedToken, encrypted: undefined }
      await profileStore.put(updated)
      set({
        activeProfile: updated,
        profiles: get().profiles.map((p) => (p.id === updated.id ? updated : p)),
      })
    },
  }
})

/** Hook für Komponenten, die eine fertige API voraussetzen (unterhalb des Auth-Gates). */
export function useApi(): PaperlessApi {
  const api = useSession((s) => s.api)
  if (!api) throw new Error('API not ready – used outside auth gate?')
  return api
}
