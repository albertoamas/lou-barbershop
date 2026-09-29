import { describe, expect, it } from 'vitest'
import { internalReturnPath } from './AuthSession'

describe('internal return path', () => {
  it('preserves an internal destination with its filters and anchor', () => {
    expect(internalReturnPath('/app/reportes?vista=cash#cash-detail')).toBe(
      '/app/reportes?vista=cash#cash-detail',
    )
  })

  it('rejects external and authentication-loop destinations', () => {
    expect(internalReturnPath('https://example.com')).toBe('/app')
    expect(internalReturnPath('//example.com')).toBe('/app')
    expect(internalReturnPath('/app/sesion-expirada')).toBe('/app')
    expect(internalReturnPath('/app/login')).toBe('/app')
    expect(internalReturnPath(undefined)).toBe('/app')
  })
})
