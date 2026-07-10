import { describe, expect, it } from 'vitest'
import { isLocalUrl, normalizeBaseUrl } from './client'

describe('normalizeBaseUrl', () => {
  it('ergänzt https und entfernt Slash am Ende', () => {
    expect(normalizeBaseUrl('paperless.example.com')).toBe('https://paperless.example.com')
    expect(normalizeBaseUrl('https://paperless.example.com/')).toBe('https://paperless.example.com')
    expect(normalizeBaseUrl('  https://x.de//  ')).toBe('https://x.de')
  })

  it('erhält Subpfade', () => {
    expect(normalizeBaseUrl('https://home.example.com/paperless/')).toBe('https://home.example.com/paperless')
  })

  it('lässt http unangetastet (Prüfung erfolgt separat)', () => {
    expect(normalizeBaseUrl('http://192.168.1.5:8000')).toBe('http://192.168.1.5:8000')
  })
})

describe('isLocalUrl', () => {
  it('erkennt lokale Adressen', () => {
    expect(isLocalUrl('http://localhost:8000')).toBe(true)
    expect(isLocalUrl('http://127.0.0.1')).toBe(true)
    expect(isLocalUrl('http://192.168.1.5:8000')).toBe(true)
    expect(isLocalUrl('http://10.0.0.2')).toBe(true)
    expect(isLocalUrl('http://172.16.0.1')).toBe(true)
    expect(isLocalUrl('http://paperless.local')).toBe(true)
  })

  it('erkennt öffentliche Adressen als nicht-lokal', () => {
    expect(isLocalUrl('https://paperless.example.com')).toBe(false)
    expect(isLocalUrl('http://172.32.0.1')).toBe(false)
    expect(isLocalUrl('http://8.8.8.8')).toBe(false)
  })
})
