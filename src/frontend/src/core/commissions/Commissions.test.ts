import { describe, expect, it } from 'vitest'
import { rateAsPercent, settlementIsMutable } from './Commissions'

describe('commission presentation rules', () => {
  it('shows basis points without losing precision', () =>
    expect(rateAsPercent(1250)).toBe('12.50 %'))
  it('only allows changes to draft settlements', () => {
    expect(settlementIsMutable('DRAFT')).toBe(true)
    expect(settlementIsMutable('PAID')).toBe(false)
  })
})
