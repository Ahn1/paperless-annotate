/** HTTP-Client für die Paperless-ngx-API: Token-Auth, Version-Pinning, Fehler-Mapping. */

export const API_VERSION = 10

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class AuthError extends ApiError {
  constructor(detail?: unknown) {
    super(401, 'Unauthorized', detail)
    this.name = 'AuthError'
  }
}

export class ForbiddenError extends ApiError {
  constructor(detail?: unknown) {
    super(403, 'Forbidden', detail)
    this.name = 'ForbiddenError'
  }
}

export class NetworkError extends Error {
  constructor(public cause?: unknown) {
    super('Network error')
    this.name = 'NetworkError'
  }
}

export interface ServerInfo {
  apiVersion: number | null
  serverVersion: string | null
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  params?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  /** multipart: FormData direkt senden (kein JSON-Header) */
  formData?: FormData
  signal?: AbortSignal
  /** Antwort als Blob statt JSON */
  blob?: boolean
  retries?: number
}

export function normalizeBaseUrl(input: string): string {
  let url = input.trim()
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`
  return url.replace(/\/+$/, '')
}

export function isLocalUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname
    return (
      host === 'localhost' ||
      host.endsWith('.local') ||
      host.endsWith('.lan') ||
      host.endsWith('.home.arpa') ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    )
  } catch {
    return false
  }
}

export class PaperlessClient {
  serverInfo: ServerInfo = { apiVersion: null, serverVersion: null }
  /** Wird bei 401 aufgerufen (z. B. zurück zum Login). */
  onUnauthorized: (() => void) | null = null
  /**
   * API-Version zunächst pinnen (v3 = 10). Ältere Server (v2) kennen die Version nicht
   * und antworten mit 406 – dann wird automatisch ohne Version-Pin weitergearbeitet.
   */
  private versionPinned = true

  constructor(
    public readonly baseUrl: string,
    private readonly token: string,
  ) {}

  private acceptHeader(): string {
    return this.versionPinned ? `application/json; version=${API_VERSION}` : 'application/json'
  }

  authHeader(): Record<string, string> {
    return { Authorization: `Token ${this.token}` }
  }

  url(path: string, params?: RequestOptions['params']): string {
    const url = new URL(`${this.baseUrl}${path}`)
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
      }
    }
    return url.toString()
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', params, body, formData, signal, blob, retries = method === 'GET' ? 2 : 0 } = options

    let requestBody: BodyInit | undefined
    if (formData) {
      requestBody = formData
    } else if (body !== undefined) {
      requestBody = JSON.stringify(body)
    }

    let lastError: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1)))
      // Pro Versuch festhalten, ob DIESER Request gepinnt gesendet wurde: parallele Requests
      // können das Flag währenddessen umlegen, der 406-Retry muss trotzdem greifen.
      const sentWithVersionPin = this.versionPinned
      const headers: Record<string, string> = {
        ...this.authHeader(),
        Accept: this.acceptHeader(),
        ...(requestBody !== undefined && !formData ? { 'Content-Type': 'application/json' } : {}),
      }
      let response: Response
      try {
        response = await fetch(this.url(path, params), { method, headers, body: requestBody, signal })
      } catch (error) {
        if (signal?.aborted) throw error
        lastError = new NetworkError(error)
        continue
      }

      this.captureServerInfo(response)

      // Älterer Server (z. B. v2) kennt die gepinnte API-Version nicht → ohne Pin sofort erneut versuchen
      if (response.status === 406 && sentWithVersionPin) {
        this.versionPinned = false
        attempt--
        continue
      }

      if (response.status === 401) {
        this.onUnauthorized?.()
        throw new AuthError(await safeJson(response))
      }
      if (response.status === 403) throw new ForbiddenError(await safeJson(response))
      if (!response.ok) {
        const detail = await safeJson(response)
        // 5xx bei GET erneut versuchen
        if (response.status >= 500 && attempt < retries) {
          lastError = new ApiError(response.status, `HTTP ${response.status}`, detail)
          continue
        }
        throw new ApiError(response.status, extractDetail(detail) ?? `HTTP ${response.status}`, detail)
      }

      if (response.status === 204) return undefined as T
      if (blob) return (await response.blob()) as T
      return (await response.json()) as T
    }
    throw lastError instanceof Error ? lastError : new NetworkError(lastError)
  }

  private captureServerInfo(response: Response) {
    const apiVersion = response.headers.get('X-Api-Version')
    const serverVersion = response.headers.get('X-Version')
    if (apiVersion) this.serverInfo.apiVersion = Number(apiVersion)
    if (serverVersion) this.serverInfo.serverVersion = serverVersion
  }

  get<T>(path: string, params?: RequestOptions['params'], signal?: AbortSignal) {
    return this.request<T>(path, { params, signal })
  }

  getBlob(path: string, params?: RequestOptions['params'], signal?: AbortSignal) {
    return this.request<Blob>(path, { params, signal, blob: true })
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body })
  }

  patch<T>(path: string, body: unknown) {
    return this.request<T>(path, { method: 'PATCH', body })
  }

  delete(path: string) {
    return this.request<void>(path, { method: 'DELETE' })
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json()
  } catch {
    try {
      return await response.text()
    } catch {
      return undefined
    }
  }
}

function extractDetail(detail: unknown): string | undefined {
  if (typeof detail === 'string' && detail.length < 300) return detail
  if (detail && typeof detail === 'object') {
    const d = (detail as Record<string, unknown>).detail
    if (typeof d === 'string') return d
    const firstEntry = Object.entries(detail as Record<string, unknown>)[0]
    if (firstEntry) {
      const [field, value] = firstEntry
      const text = Array.isArray(value) ? value.join(', ') : String(value)
      if (text.length < 300) return `${field}: ${text}`
    }
  }
  return undefined
}

/**
 * Verbindungstest für das Onboarding – unauthentifiziert gegen /api/documents/.
 * Bewusst NICHT /api/ (leitet bei Paperless auf die HTML-only Schema-Ansicht um → 406)
 * und ohne Version-Pin (ältere Server kennen die Version nicht → 406).
 * Unterscheidet: erreichbar / CORS-Problem / nicht erreichbar.
 *
 * Hinweis: X-Api-Version/X-Version sind cross-origin nur lesbar, wenn der Server sie
 * per Access-Control-Expose-Headers freigibt – sonst bleiben sie null (keine Warnung möglich).
 */
export async function probeServer(baseUrl: string): Promise<
  | { ok: true; apiVersion: number | null; serverVersion: string | null }
  | { ok: false; reason: 'cors' | 'unreachable' | 'not-paperless' }
> {
  try {
    const response = await fetch(`${baseUrl}/api/documents/?page_size=1`, {
      headers: { Accept: 'application/json' },
    })
    // Auch 401/403 heißt: Server da und CORS ok (Auth folgt im nächsten Schritt)
    const apiVersion = response.headers.get('X-Api-Version')
    const serverVersion = response.headers.get('X-Version')
    if (response.ok || response.status === 401 || response.status === 403) {
      return { ok: true, apiVersion: apiVersion ? Number(apiVersion) : null, serverVersion }
    }
    return { ok: false, reason: 'not-paperless' }
  } catch {
    // fetch wirft sowohl bei CORS als auch bei Nicht-Erreichbarkeit. Heuristik:
    // Wenn ein no-cors-Request durchgeht, ist der Server da → CORS-Problem.
    try {
      await fetch(`${baseUrl}/api/documents/`, { mode: 'no-cors' })
      return { ok: false, reason: 'cors' }
    } catch {
      return { ok: false, reason: 'unreachable' }
    }
  }
}

/** Token per Username/Passwort abholen (wird nicht gespeichert). */
export async function obtainToken(baseUrl: string, username: string, password: string): Promise<string> {
  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch (error) {
    throw new NetworkError(error)
  }
  if (!response.ok) throw new ApiError(response.status, 'Login failed', await safeJson(response))
  const data = (await response.json()) as { token?: string }
  if (!data.token) throw new ApiError(500, 'No token in response')
  return data.token
}
