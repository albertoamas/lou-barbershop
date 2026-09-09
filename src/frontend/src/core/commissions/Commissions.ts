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
