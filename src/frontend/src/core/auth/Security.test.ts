import { describe, expect, it } from 'vitest'
import {
  groupedKey,
  isAuthenticatorUri,
  passwordChecks,
  passwordIsStrong,
  recoveryCodesText,
} from './Security'

describe('password requirements', () => {
  it('reports each rule the backend enforces', () => {
    const met = (password: string) =>
      Object.fromEntries(passwordChecks(password).map((check) => [check.id, check.met]))
    expect(met('abc')).toEqual({
      length: false,
      upper: false,
      lower: true,
      digit: false,
      symbol: false,
    })
    expect(met('Ñandú-segura-2026')).toEqual({
      length: true,
      upper: true,
      lower: true,
      digit: true,
      symbol: true,
    })
  })

  it('accepts only passwords that meet every rule', () => {
    expect(passwordIsStrong('Clave-local!8426')).toBe(true)
    expect(passwordIsStrong('clave-local!8426')).toBe(false)
    expect(passwordIsStrong('Clavelocal8426')).toBe(false)
    expect(passwordIsStrong('Cl4ve!')).toBe(false)
  })
})

describe('two-step verification helpers', () => {
  it('groups the setup key in blocks of four', () => {
    expect(groupedKey('abcd efgh ijkl mn')).toBe('ABCD EFGH IJKL MN')
    expect(groupedKey('ABCDEFGH')).toBe('ABCD EFGH')
  })

  it('only trusts authenticator links', () => {
    expect(isAuthenticatorUri('otpauth://totp/Lou:alberto?secret=X')).toBe(true)
    expect(isAuthenticatorUri('javascript:alert(1)')).toBe(false)
  })

  it('writes recovery codes as a plain text file', () => {
    const text = recoveryCodesText(['aaaa-bbbb', 'cccc-dddd'], 'alberto', '6 oct 2026')
    expect(text).toContain('Cuenta: alberto')
    expect(text.trim().split('\n').slice(-2)).toEqual(['aaaa-bbbb', 'cccc-dddd'])
  })
})
