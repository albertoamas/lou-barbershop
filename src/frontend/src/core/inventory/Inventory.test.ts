import { describe, expect, it } from 'vitest'
import { receiptTotal } from './Inventory'

describe('inventory rules', () => {
  it('calculates a multi-product receipt without floating point money', () => {
    expect(
      receiptTotal([
        { quantity: 2, unitCostCents: 1250 },
        { quantity: 3, unitCostCents: 900 },
      ]),
    ).toBe(5200)
  })
})
