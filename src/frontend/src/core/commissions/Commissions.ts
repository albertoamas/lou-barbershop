import type { PaymentMethod } from '../sales/Sales'

export type CommissionEntryStatus = 'AVAILABLE' | 'SETTLED' | 'PAID' | 'VOIDED'
export type CommissionEntryType = 'EARNING' | 'REVERSAL'
export type SettlementStatus = 'DRAFT' | 'CLOSED' | 'PAID'

export interface CommissionEntry {
  id: string
  barberId: string
  operationId?: string
  saleItemId?: string
  description: string
  type: CommissionEntryType
  baseCents: number
  rateBasisPoints: number
  amountCents: number
  status: CommissionEntryStatus
  sourceEntryId?: string
  reason?: string
  earnedAt: string
}

export interface SettlementItem {
  id: string
  commissionEntryId: string
  operationId?: string
  description: string
  baseCents: number
  rateBasisPoints: number
  amountCents: number
  type: CommissionEntryType
}

export interface Settlement {
  id: string
  barberId: string
  barberName: string
  periodStart: string
  periodEnd: string
  status: SettlementStatus
  commissionTotalCents: number
  adjustmentTotalCents: number
  payableTotalCents: number
  paymentMethod?: PaymentMethod
  paymentDate?: string
  closedAt?: string
  paidAt?: string
  version: number
  items: SettlementItem[]
  adjustments: { id: string; amountCents: number; reason: string; createdAt: string }[]
}

export const rateAsPercent = (basisPoints: number) => `${(basisPoints / 100).toFixed(2)} %`
export const settlementIsMutable = (status: SettlementStatus) => status === 'DRAFT'

export const commissionStatusLabel = (status: CommissionEntryStatus) =>
  (
    ({
      AVAILABLE: 'Disponible',
      SETTLED: 'En liquidación',
      PAID: 'Pagada',
      VOIDED: 'Anulada',
    }) as const
  )[status]

export const settlementStatusLabel = (status: SettlementStatus) =>
  (
    ({
      DRAFT: 'Borrador',
      CLOSED: 'Cerrada',
      PAID: 'Pagada',
    }) as const
  )[status]

export const commissionBalances = (entries: CommissionEntry[] | undefined) =>
  (entries ?? []).reduce(
    (totals, entry) => {
      if (entry.status === 'AVAILABLE') totals.availableCents += entry.amountCents
      if (entry.status === 'SETTLED') totals.inSettlementCents += entry.amountCents
      if (entry.status === 'PAID') totals.paidCents += entry.amountCents
      return totals
    },
    { availableCents: 0, inSettlementCents: 0, paidCents: 0 },
  )

export const signedBolivianosToCents = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.')
  if (!/^-?\d+(?:\.\d{1,2})?$/.test(normalized) || normalized === '-0') return null
  const sign = normalized.startsWith('-') ? -1 : 1
  const unsigned = normalized.replace('-', '')
  const [whole, decimal = ''] = unsigned.split('.')
  const cents = sign * (Number(whole) * 100 + Number(decimal.padEnd(2, '0')))
  return cents !== 0 && Number.isSafeInteger(cents) ? cents : null
}
