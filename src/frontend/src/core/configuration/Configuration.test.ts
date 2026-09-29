import { describe, expect, it } from 'vitest'
import { bolivianosToCents, centsToBolivianos, percentToBasisPoints } from './Configuration'

describe('money input for configuration', () => {
  it('converts BOB decimal input into integer cents', () => {
    expect(bolivianosToCents('60,50')).toBe(6050)
    expect(bolivianosToCents('70')).toBe(7000)
  })

  it('rejects ambiguous or over-precise values', () => {
    expect(bolivianosToCents('60.005')).toBeNull()
    expect(bolivianosToCents('-1')).toBeNull()
  })

  it('formats cents without floating point domain storage', () => {
    expect(centsToBolivianos(6050)).toContain('60')
  })
})

describe('commission rate input', () => {
  it('converts two decimal percent without rounding drift', () => {
    expect(percentToBasisPoints('50,29')).toBe(5029)
    expect(percentToBasisPoints('100')).toBe(10000)
  })

  it('rejects values outside the rate contract', () => {
    expect(percentToBasisPoints('100,01')).toBeNull()
    expect(percentToBasisPoints('50,123')).toBeNull()
    expect(percentToBasisPoints('-5')).toBeNull()
  })
})
