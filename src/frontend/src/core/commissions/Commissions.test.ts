import { describe, expect, it } from 'vitest'
import {
  barberDebts,
  commissionBalances,
  commissionMatches,
  cutoffPreview,
  debtSummary,
  entriesByDay,
  personalBalance,
  settlementItemsSummary,
  commissionStatusLabel,
  rateAsPercent,
  settlementIsMutable,
  settlementStatusLabel,
  signedBolivianosToCents,
  type CommissionEntry,
  type Settlement,
} from './Commissions'

describe('commission presentation rules', () => {
  it('shows basis points without losing precision or adding zeros', () => {
    expect(rateAsPercent(1250)).toBe('12,5 %')
    expect(rateAsPercent(4500)).toBe('45 %')
    expect(rateAsPercent(1234)).toBe('12,34 %')
  })
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

const entry = (overrides: Partial<CommissionEntry>): CommissionEntry => ({
  id: 'e',
  barberId: 'diego',
  description: 'Corte',
  type: 'EARNING',
  baseCents: 10_000,
  rateBasisPoints: 5_000,
  amountCents: 5_000,
  status: 'AVAILABLE',
  earnedAt: '2026-10-01T15:00:00Z',
  ...overrides,
})
const settlement = (overrides: Partial<Settlement>): Settlement => ({
  id: 's',
  barberId: 'diego',
  barberName: 'Diego',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-15',
  status: 'DRAFT',
  commissionTotalCents: 0,
  adjustmentTotalCents: 0,
  payableTotalCents: 0,
  version: 1,
  items: [],
  adjustments: [],
  ...overrides,
})

describe('settlement workflow', () => {
  const barbers = [
    { id: 'diego', name: 'Diego' },
    { id: 'mateo', name: 'Mateo' },
    { id: 'lucas', name: 'Lucas' },
  ]

  it('names the next step for each barber and sorts by what is owed', () => {
    const debts = barberDebts(
      barbers,
      [
        entry({ barberId: 'diego', amountCents: 1_000 }),
        entry({ barberId: 'mateo', amountCents: 2_000 }),
        entry({ barberId: 'mateo', amountCents: 9_000, status: 'PAID' }),
      ],
      [
        settlement({ id: 'old', barberId: 'diego', status: 'PAID', payableTotalCents: 7_000 }),
        settlement({ id: 'open', barberId: 'diego', status: 'CLOSED', payableTotalCents: 5_000 }),
      ],
    )
    expect(debts.map((debt) => [debt.name, debt.owedCents, debt.next])).toEqual([
      ['Diego', 6_000, 'pay'],
      ['Mateo', 2_000, 'prepare'],
      ['Lucas', 0, 'none'],
    ])
    expect(debts[0]?.open?.id).toBe('open')
    expect(debtSummary(debts)).toEqual({ totalCents: 8_000, barbers: 2, readyToPay: 1 })
  })

  it('asks to review a draft before anything else', () => {
    const [debt] = barberDebts(barbers.slice(0, 1), [entry({})], [settlement({})])
    expect(debt?.next).toBe('review')
  })

  it('splits the barber balance into grouped and loose money', () => {
    const ready = settlement({ status: 'CLOSED', payableTotalCents: 4_000 })
    expect(
      personalBalance(
        [entry({ amountCents: 1_500 }), entry({ amountCents: 900, status: 'SETTLED' })],
        [ready, settlement({ status: 'PAID', payableTotalCents: 9_999 })],
      ),
    ).toEqual({ owedCents: 5_500, looseCents: 1_500, inSettlementCents: 4_000, ready })
  })

  it('previews the commissions a cutoff includes using the business day', () => {
    const entries = [
      // 23:30 in La Paz on 1 October, already 2 October in UTC.
      entry({ earnedAt: '2026-10-02T03:30:00Z', amountCents: 1_000 }),
      entry({ earnedAt: '2026-10-02T15:00:00Z', amountCents: 2_000 }),
      entry({ earnedAt: '2026-09-30T15:00:00Z', amountCents: 500, status: 'SETTLED' }),
      entry({ barberId: 'mateo', earnedAt: '2026-09-30T15:00:00Z' }),
    ]
    expect(cutoffPreview(entries, 'diego', '2026-10-01')).toEqual({ count: 1, cents: 1_000 })
    expect(cutoffPreview(entries, 'diego', '2026-10-02')).toEqual({ count: 2, cents: 3_000 })
  })

  it('filters by state and barber and groups by business day', () => {
    const entries = [
      entry({ id: 'a', earnedAt: '2026-10-01T15:00:00Z' }),
      entry({ id: 'b', earnedAt: '2026-10-02T02:00:00Z', amountCents: 1_000 }),
      entry({ id: 'c', earnedAt: '2026-10-02T15:00:00Z', status: 'PAID', barberId: 'mateo' }),
    ]
    expect(entries.filter((item) => commissionMatches(item, 'AVAILABLE', 'diego'))).toHaveLength(2)
    expect(entries.filter((item) => commissionMatches(item, 'ALL', 'mateo'))).toHaveLength(1)
    expect(
      entriesByDay(entries).map((day) => [
        day.date,
        day.items.map((item) => item.id),
        day.totalCents,
      ]),
    ).toEqual([
      ['2026-10-02', ['c'], 5_000],
      ['2026-10-01', ['b', 'a'], 6_000],
    ])
  })

  it('summarises settlement items in words', () => {
    expect(settlementItemsSummary([{ type: 'EARNING' }])).toBe('1 comisión')
    expect(
      settlementItemsSummary([{ type: 'EARNING' }, { type: 'EARNING' }, { type: 'REVERSAL' }]),
    ).toBe('2 comisiones y 1 corrección')
  })
})
