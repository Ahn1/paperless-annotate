import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/** Serverprofil – Zugangsdaten bleiben ausschließlich lokal (IndexedDB). */
export interface ServerProfile {
  id: string
  name: string
  baseUrl: string
  /** Klartext-Token ODER (bei aktivem PIN-Schutz) verschlüsseltes Token. */
  token: string
  /** Wenn gesetzt, ist `token` mit einem aus der PIN abgeleiteten Schlüssel verschlüsselt. */
  encrypted?: { salt: string; iv: string }
  apiVersion?: number
  serverVersion?: string
  createdAt: string
}

export interface AnnotationDraft {
  /** `${profileId}:${documentId}:${versionId ?? 'current'}` */
  key: string
  profileId: string
  documentId: number
  versionId: number | null
  updatedAt: string
  /** Serialisierte Annotationen (Editor-Zwischenstand). */
  payload: unknown
}

interface AppDB extends DBSchema {
  profiles: { key: string; value: ServerProfile }
  kv: { key: string; value: unknown }
  drafts: { key: string; value: AnnotationDraft }
}

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null

export function getDb() {
  dbPromise ??= openDB<AppDB>('paperless-annotator', 1, {
    upgrade(db) {
      db.createObjectStore('profiles', { keyPath: 'id' })
      db.createObjectStore('kv')
      db.createObjectStore('drafts', { keyPath: 'key' })
    },
  })
  return dbPromise
}

export const kv = {
  async get<T>(key: string): Promise<T | undefined> {
    return (await (await getDb()).get('kv', key)) as T | undefined
  },
  async set(key: string, value: unknown): Promise<void> {
    await (await getDb()).put('kv', value, key)
  },
  async del(key: string): Promise<void> {
    await (await getDb()).delete('kv', key)
  },
}

export const profileStore = {
  async all(): Promise<ServerProfile[]> {
    return (await getDb()).getAll('profiles')
  },
  async get(id: string): Promise<ServerProfile | undefined> {
    return (await getDb()).get('profiles', id)
  },
  async put(profile: ServerProfile): Promise<void> {
    await (await getDb()).put('profiles', profile)
  },
  async del(id: string): Promise<void> {
    await (await getDb()).delete('profiles', id)
  },
}

export const draftStore = {
  key(profileId: string, documentId: number, versionId: number | null) {
    return `${profileId}:${documentId}:${versionId ?? 'current'}`
  },
  async get(key: string): Promise<AnnotationDraft | undefined> {
    return (await getDb()).get('drafts', key)
  },
  async put(draft: AnnotationDraft): Promise<void> {
    await (await getDb()).put('drafts', draft)
  },
  async del(key: string): Promise<void> {
    await (await getDb()).delete('drafts', key)
  },
}
