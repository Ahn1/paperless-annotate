import { describe, expect, it } from 'vitest'
import { decryptToken, encryptToken } from './crypto'

describe('PIN-Token-Verschlüsselung (WebCrypto)', () => {
  it('ver- und entschlüsselt verlustfrei', async () => {
    const token = 'abc123-paperless-token-xyz'
    const { cipher, salt, iv } = await encryptToken(token, '1234')
    expect(cipher).not.toContain(token)
    await expect(decryptToken(cipher, '1234', salt, iv)).resolves.toBe(token)
  })

  it('wirft bei falscher PIN', async () => {
    const { cipher, salt, iv } = await encryptToken('secret', '1234')
    await expect(decryptToken(cipher, '9999', salt, iv)).rejects.toThrow()
  })

  it('erzeugt pro Aufruf frische Salt/IV', async () => {
    const a = await encryptToken('secret', '1234')
    const b = await encryptToken('secret', '1234')
    expect(a.cipher).not.toBe(b.cipher)
    expect(a.salt).not.toBe(b.salt)
  })
})
