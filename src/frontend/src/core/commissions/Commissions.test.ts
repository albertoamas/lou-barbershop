import { describe, expect, it } from 'vitest'
import {
  commissionBalances,
  commissionStatusLabel,
  rateAsPercent,
  settlementIsMutable,
  settlementStatusLabel,
  signedBolivianosToCents,
  type CommissionEntry,
} from './Commissions'

describe('commission presentation rules', () => {
  it('shows basis points without losing precision', () =>
    expect(rateAsPercent(1250)).toBe('12.50 %'))
  it('only allows changes to draft settlements', () => {
    expect(settlementIsMutable('DRAFT')).toBe(true)
    expect(settlementIsMutable('PAID')).toBe(false)
  })

  it('keeps available debt, debt in settlements and paid history separate', () => {
    const entry = (status: CommissionEntry['status'], amountCents: number) =>
      ({ status, amountCents }) as CommissionEntry

    expect(
      commissionBalances([
        entry('AVAILABLE', 4_500),
        entry('AVAILABLE', -500),
        entry('SETTLED', 3_000),
        entry('PAID', 8_000),
        entry('VOIDED', 2_000),
      ]),
    ).toEqual({ availableCents: 4_000, inSettlementCents: 3_000, paidCents: 8_000 })
  })

  it('translates internal statuses for the interface', () => {
    expect(commissionStatusLabel('SETTLED')).toBe('En liquidación')
    expect(settlementStatusLabel('CLOSED')).toBe('Cerrada')
  })

  it('converts signed bolivianos without accepting zero or excess decimals', () => {
    expect(signedBolivianosToCents('12,50')).toBe(1_250)
    expect(signedBolivianosToCents('-4.25')).toBe(-425)
    expect(signedBolivianosToCents('0')).toBeNull()
    expect(signedBolivianosToCents('1.234')).toBeNull()
  })
})
