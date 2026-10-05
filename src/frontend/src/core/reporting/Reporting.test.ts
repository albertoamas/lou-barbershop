import { describe, expect, it } from 'vitest'
import {
  activitySentence,
  basisPointsToPercent,
  cashOutflows,
  comparisonRange,
  largestExpense,
  paymentReportLabel,
  percentChange,
  presetRange,
  resultLines,
  salesSeries,
  type AuditLog,
  type OperationReportSource,
  type PeriodReport,
} from './Reporting'

describe('reporting presentation rules', () => {
  it('renders basis points with at most one decimal and a comma', () => {
    expect(basisPointsToPercent(3333)).toBe('33,3 %')
    expect(basisPointsToPercent(2500)).toBe('25 %')
    expect(paymentReportLabel('CASH')).toBe('Efectivo')
  })
})

describe('period presets and comparison', () => {
  // Monday 5 October 2026.
  const today = '2026-10-05'

  it('resolves the presets from the business day', () => {
    expect(presetRange('today', today)).toEqual({ from: today, to: today })
    expect(presetRange('week', '2026-10-08')).toEqual({ from: today, to: '2026-10-08' })
    expect(presetRange('week', today)).toEqual({ from: today, to: today })
    expect(presetRange('month', today)).toEqual({ from: '2026-10-01', to: today })
    expect(presetRange('lastMonth', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('compares with the same stretch of the previous day, week or month', () => {
    expect(comparisonRange(today, today, 'today')).toEqual({
      from: '2026-10-04',
      to: '2026-10-04',
      kind: 'day',
    })
    expect(comparisonRange(today, '2026-10-08', 'week')).toEqual({
      from: '2026-09-28',
      to: '2026-10-01',
      kind: 'week',
    })
    expect(comparisonRange('2026-10-01', today, 'month')).toEqual({
      from: '2026-09-01',
      to: '2026-09-05',
      kind: 'month',
    })
    expect(comparisonRange('2026-09-01', '2026-09-30', 'lastMonth')).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
      kind: 'month',
    })
    expect(comparisonRange('2026-03-01', '2026-03-31', 'month').to).toBe('2026-02-28')
  })

  it('uses the same number of days right before a custom range', () => {
    expect(comparisonRange('2026-09-10', '2026-09-19')).toEqual({
      from: '2026-08-31',
      to: '2026-09-09',
      kind: 'period',
    })
  })

  it('reports whole percent changes and nothing without a base', () => {
    expect(percentChange(112, 100)).toBe(12)
    expect(percentChange(80, 100)).toBe(-20)
    expect(percentChange(50, -100)).toBe(150)
    expect(percentChange(10, 0)).toBeNull()
  })
})

const operation = (date: string, totalCents: number) =>
  ({ id: date + totalCents, date, totalCents }) as OperationReportSource

describe('sales series', () => {
  it('groups by day for a month and fills empty days', () => {
    const { grain, buckets } = salesSeries(
      [operation('2026-10-01', 1_000), operation('2026-10-01', 500), operation('2026-10-03', 200)],
      '2026-10-01',
      '2026-10-03',
    )
    expect(grain).toBe('day')
    expect(buckets.map((bucket) => [bucket.from, bucket.totalCents, bucket.count])).toEqual([
      ['2026-10-01', 1_500, 2],
      ['2026-10-02', 0, 0],
      ['2026-10-03', 200, 1],
    ])
  })

  it('groups by week up to three months and by month beyond', () => {
    const weeks = salesSeries([operation('2026-08-09', 300)], '2026-08-01', '2026-09-15')
    expect(weeks.grain).toBe('week')
    expect(weeks.buckets[1]).toMatchObject({
      from: '2026-08-08',
      to: '2026-08-14',
      totalCents: 300,
    })
    expect(weeks.buckets.at(-1)?.to).toBe('2026-09-15')

    const months = salesSeries([], '2026-01-15', '2026-10-05')
    expect(months.grain).toBe('month')
    expect(months.buckets[0]).toMatchObject({ from: '2026-01-15', to: '2026-01-31' })
    expect(months.buckets).toHaveLength(10)
  })
})

describe('result and outflows', () => {
  const period = {
    serviceRevenueCents: 5_000,
    productRevenueCents: 2_000,
    productCostCents: 800,
    commissionGeneratedCents: 1_500,
    expenseCents: 6_000,
    approximateOperatingResultCents: -1_300,
    expenses: [
      {
        id: 'e1',
        date: '2026-10-02',
        category: 'Alquiler',
        description: '',
        method: 'QR',
        amountCents: 5_000,
      },
      {
        id: 'e2',
        date: '2026-10-01',
        category: 'Limpieza',
        description: 'Escobas',
        method: 'CASH',
        amountCents: 1_000,
      },
    ],
    inventoryPurchases: [{ id: 'p1', date: '2026-10-03', method: 'CASH', amountCents: 700 }],
    settlementPayments: [
      { id: 's1', date: '2026-10-01', barberName: 'Diego', method: 'QR', amountCents: 900 },
    ],
  } as unknown as PeriodReport

  it('breaks the result down the same way the backend computes it', () => {
    const lines = resultLines(period)
    expect(lines.salesCents).toBe(7_000)
    expect(
      lines.salesCents - lines.productCostCents - lines.commissionCents - lines.expenseCents,
    ).toBe(lines.resultCents)
    expect(largestExpense(period.expenses)?.category).toBe('Alquiler')
  })

  it('lists every outflow newest first with a plain label', () => {
    expect(cashOutflows(period).map((row) => row.label)).toEqual([
      'Compra de productos',
      'Alquiler',
      'Limpieza: Escobas',
      'Pago a Diego',
    ])
  })
})

describe('activity sentences', () => {
  const log = (overrides: Partial<AuditLog>): AuditLog => ({
    id: 'a',
    actorName: 'alberto',
    action: 'Modified',
    entityType: 'settlement',
    entityId: 'x',
    createdAt: '2026-10-05T05:40:00Z',
    ...overrides,
  })

  it('reads status changes as the business action', () => {
    expect(
      activitySentence(log({ beforeData: '{"Status": 1}', afterData: '{"Status": 2}' })),
    ).toEqual({ who: 'alberto', what: 'registró el pago de una liquidación' })
    expect(
      activitySentence(
        log({
          entityType: 'sale_operation',
          beforeData: '{"Status": 1}',
          afterData: '{"Status": 2}',
        }),
      ).what,
    ).toBe('cobró una atención')
  })

  it('names creations, plain edits and unknown records', () => {
    expect(activitySentence(log({ action: 'Added', entityType: 'expense' })).what).toBe(
      'registró un gasto',
    )
    expect(
      activitySentence(log({ beforeData: '{"Status": 0}', afterData: '{"Status": 0}' })).what,
    ).toBe('modificó una liquidación')
    expect(activitySentence(log({ action: 'Deleted', entityType: 'thing' })).what).toBe(
      'eliminó un registro',
    )
    expect(activitySentence(log({ afterData: 'not json' })).what).toBe('modificó una liquidación')
  })

  it('attributes changes without a staff actor to online booking', () => {
    const withoutActor = log({ action: 'Added', entityType: 'appointment' })
    delete withoutActor.actorName
    expect(activitySentence(withoutActor)).toEqual({
      who: 'Reserva en línea',
      what: 'agendó una cita',
    })
  })
})
