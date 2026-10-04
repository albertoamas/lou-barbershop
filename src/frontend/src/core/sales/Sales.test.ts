import { describe, expect, it } from 'vitest'
import { cashChange, isPendingOperation, paymentSplit, stageOf } from './Sales'
describe('isPendingOperation', () => {
  it('waits on open and ready operations only', () => {
    expect(isPendingOperation({ status: 'DRAFT' })).toBe(true)
    expect(isPendingOperation({ status: 'READY_TO_PAY' })).toBe(true)
    expect(isPendingOperation({ status: 'PAID' })).toBe(false)
    expect(isPendingOperation({ status: 'REVERSED' })).toBe(false)
  })
})

describe('paymentSplit', () => {
  it('puts the whole total on one method', () => {
    expect(paymentSplit('CASH', 9000)).toEqual({ cash: 9000, qr: 0 })
    expect(paymentSplit('QR', 9000)).toEqual({ cash: 0, qr: 9000 })
  })

  it('leaves the rest to QR in a mixed payment and never exceeds the total', () => {
    expect(paymentSplit('MIXED', 9000, 3000)).toEqual({ cash: 3000, qr: 6000 })
    expect(paymentSplit('MIXED', 9000, 12000)).toEqual({ cash: 9000, qr: 0 })
    expect(paymentSplit('MIXED', 9000, -500)).toEqual({ cash: 0, qr: 9000 })
  })
})

describe('cashChange', () => {
  it('returns the change for 100 Bs received on 60 Bs due', () =>
    expect(cashChange(6000, 10000)).toBe(4000))
  it('reports what is still missing as a negative amount', () =>
    expect(cashChange(6000, 5000)).toBe(-1000))
})

describe('stageOf', () => {
  it('maps statuses to the three visible steps', () => {
    expect(stageOf({ status: 'DRAFT' }, false)).toBe('consumption')
    expect(stageOf({ status: 'DRAFT' }, true)).toBe('checkout')
    expect(stageOf({ status: 'READY_TO_PAY' }, false)).toBe('checkout')
    expect(stageOf({ status: 'PAID' }, false)).toBe('done')
    expect(stageOf({ status: 'REVERSED' }, false)).toBe('done')
  })
})
