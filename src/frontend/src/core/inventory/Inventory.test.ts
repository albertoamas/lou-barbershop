import { describe, expect, it } from 'vitest'
import {
  adjustmentDelta,
  movementLabel,
  receiptTotal,
  stockLevel,
  stockMatches,
  stockStatus,
  type InventoryItem,
} from './Inventory'

describe('inventory rules', () => {
  it('calculates a multi-product receipt without floating point money', () => {
    expect(
      receiptTotal([
        { quantity: 2, unitCostCents: 1250 },
        { quantity: 3, unitCostCents: 900 },
      ]),
    ).toBe(5200)
  })

  it('describes movements as historical events', () => {
    expect(movementLabel('COUNT_ADJUSTMENT')).toBe('Ajuste por conteo')
    expect(movementLabel('SALE_REVERSAL')).toBe('Reverso de venta')
  })
})

describe('stock states and adjustments', () => {
  const item = (quantity: number, lowStock: boolean, active = true) =>
    ({
      productId: 'p',
      name: 'Cera mate',
      sku: 'CER-1',
      salePriceCents: 1,
      quantity,
      minimumStock: 3,
      lowStock,
      active,
    }) as InventoryItem

  it('tells out of stock apart from low stock', () => {
    expect(stockStatus(item(0, true))).toBe('OUT')
    expect(stockStatus(item(2, true))).toBe('LOW')
    expect(stockStatus(item(9, false))).toBe('OK')
    expect(stockStatus(item(0, true, false))).toBe('INACTIVE')
  })

  it('filters by state and by name or code', () => {
    expect(stockMatches(item(0, true), 'LOW', '')).toBe(true)
    expect(stockMatches(item(2, true), 'OUT', '')).toBe(false)
    expect(stockMatches(item(9, false), 'ALL', 'cer-1')).toBe(true)
    expect(stockMatches(item(9, false), 'ALL', 'gel')).toBe(false)
  })

  it('draws the level against twice the minimum', () => {
    expect(stockLevel({ quantity: 3, minimumStock: 3 })).toBe(50)
    expect(stockLevel({ quantity: 12, minimumStock: 3 })).toBe(100)
    expect(stockLevel({ quantity: 0, minimumStock: 3 })).toBe(0)
  })

  it('turns a count or units that left into the change, without signed input', () => {
    expect(adjustmentDelta('COUNT_ADJUSTMENT', 7, '5')).toBe(-2)
    expect(adjustmentDelta('COUNT_ADJUSTMENT', 7, '9')).toBe(2)
    expect(adjustmentDelta('DAMAGE', 7, '1')).toBe(-1)
    expect(adjustmentDelta('LOSS', 7, '0')).toBeUndefined()
    expect(adjustmentDelta('COUNT_ADJUSTMENT', 7, '-2')).toBeUndefined()
  })
})
