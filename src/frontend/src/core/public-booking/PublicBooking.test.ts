import { describe, expect, it } from 'vitest'
import { managementTokenFromHash, managementTokenFromInput } from './PublicBooking'

describe('public booking management token', () => {
  it('accepts only a 256-bit base64url token from the fragment', () => {
    const token = 'a'.repeat(43)
    expect(managementTokenFromHash(`#${token}`)).toBe(token)
    expect(managementTokenFromHash('#short')).toBe('')
    expect(managementTokenFromHash(`#${'a'.repeat(42)}+`)).toBe('')
  })

  it('extracts a management token from a saved Lou link or a raw token', () => {
    const token = 'a'.repeat(43)

    expect(managementTokenFromInput(token)).toBe(token)
    expect(managementTokenFromInput(`/mi-cita#${token}`)).toBe(token)
    expect(managementTokenFromInput(`http://localhost:8088/mi-cita#${token}`)).toBe(token)
    expect(managementTokenFromInput(`https://example.com/otra-ruta#${token}`)).toBe('')
    expect(managementTokenFromInput('texto sin enlace')).toBe('')
  })
})
