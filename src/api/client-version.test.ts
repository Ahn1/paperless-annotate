import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaperlessClient } from './client'

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PaperlessClient – adaptives API-Version-Pinning', () => {
  it('wiederholt bei 406 automatisch ohne Version-Pin (ältere Server, z. B. v2)', async () => {
    const accepts: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        const accept = (init?.headers as Record<string, string>).Accept
        accepts.push(accept)
        if (accept.includes('version=')) return new Response('Not Acceptable', { status: 406 })
        return jsonResponse({ count: 0, results: [] })
      }),
    )

    const client = new PaperlessClient('https://paper.example.com', 'token')
    const result = await client.get<{ count: number }>('/api/documents/')

    expect(result.count).toBe(0)
    expect(accepts[0]).toContain('version=')
    expect(accepts[1]).toBe('application/json')
  })

  it('merkt sich den Downgrade für Folge-Requests', async () => {
    const accepts: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        const accept = (init?.headers as Record<string, string>).Accept
        accepts.push(accept)
        if (accept.includes('version=')) return new Response('Not Acceptable', { status: 406 })
        return jsonResponse({})
      }),
    )

    const client = new PaperlessClient('https://paper.example.com', 'token')
    await client.get('/api/documents/')
    await client.get('/api/tags/')

    // Nur der allererste Request trägt den Pin, danach nie wieder
    expect(accepts.filter((accept) => accept.includes('version='))).toHaveLength(1)
  })

  it('pinnt bei v3-Servern weiterhin die API-Version', async () => {
    const accepts: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
        accepts.push((init?.headers as Record<string, string>).Accept)
        return jsonResponse({}, 200, { 'X-Api-Version': '10', 'X-Version': '3.0.0' })
      }),
    )

    const client = new PaperlessClient('https://paper.example.com', 'token')
    await client.get('/api/documents/')
    await client.get('/api/tags/')

    expect(accepts.every((accept) => accept.includes('version=10'))).toBe(true)
    expect(client.serverInfo).toEqual({ apiVersion: 10, serverVersion: '3.0.0' })
  })
})
