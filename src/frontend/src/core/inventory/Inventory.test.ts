import { describe, expect, it } from 'vitest'
import {
  filterStock,
  movementLabel,
  receiptTotal,
  stockAlerts,
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

  it('finds active low-stock products without counting inactive catalog entries', () => {
    const item = (name: string, active: boolean, lowStock: boolean) =>
      ({ productId: name, name, active, lowStock }) as InventoryItem
    const products = [
      item('Cera mate', true, true),
      item('Pomada', true, false),
      item('Cera antigua', false, true),
    ]

    expect(stockAlerts(products).map((value) => value.name)).toEqual(['Cera mate'])
    expect(filterStock(products, 'cera', true).map((value) => value.name)).toEqual(['Cera mate'])
  })

  it('describes movements as historical events', () => {
    expect(movementLabel('COUNT_ADJUSTMENT')).toBe('Ajuste por conteo')
    expect(movementLabel('SALE_REVERSAL')).toBe('Reverso de venta')
  })
})
