import { describe, expect, it } from 'vitest'
import { managementTokenFromHash } from './PublicBooking'

describe('public booking management token', () => {
  it('accepts only a 256-bit base64url token from the fragment', () => {
    const token = 'a'.repeat(43)
    expect(managementTokenFromHash(`#${token}`)).toBe(token)
    expect(managementTokenFromHash('#short')).toBe('')
    expect(managementTokenFromHash(`#${'a'.repeat(42)}+`)).toBe('')
  })
})
