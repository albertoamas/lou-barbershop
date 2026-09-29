import { describe, expect, it } from 'vitest'
import { operationStep, paymentDifference, paymentDraftFor, paymentMatches } from './Sales'
describe('paymentMatches', () => {
  it('accepts 30 Bs cash plus 40 Bs QR for 70 Bs', () =>
    expect(paymentMatches(7000, 3000, 4000)).toBe(true))
  it.each([
    [2999, 4000],
    [3000, 4001],
    [-1, 7001],
  ])('rejects under, over and negative', (cash, qr) =>
    expect(paymentMatches(7000, cash, qr)).toBe(false),
  )
})

describe('paymentDraftFor', () => {
  it('clears the previous collection when another operation is opened', () =>
    expect(
      paymentDraftFor('paid-operation', 'courtesy-operation', { cash: 3000, qr: 4000 }),
    ).toEqual({
      cash: 0,
      qr: 0,
    }))
})

describe('operation workflow', () => {
  it('calculates a positive shortage and a negative excess in cents', () => {
    expect(paymentDifference(7000, 3000, 3500)).toBe(500)
    expect(paymentDifference(7000, 3000, 4500)).toBe(-500)
  })

  it('maps persisted states to the visible stage', () => {
    expect(operationStep()).toBe(1)
    expect(operationStep({ status: 'DRAFT' })).toBe(2)
    expect(operationStep({ status: 'READY_TO_PAY' })).toBe(4)
    expect(operationStep({ status: 'PAID' })).toBe(5)
  })
})
