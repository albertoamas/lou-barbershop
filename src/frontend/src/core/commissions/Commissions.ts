import type { PaymentMethod } from '../sales/Sales'
import { businessDateFromIso } from '../scheduling/Scheduling'

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

// "45 %", "12,5 %": no trailing zeros, Spanish decimal comma.
export const rateAsPercent = (basisPoints: number) =>
  `${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 }).format(basisPoints / 100)} %`
export const settlementIsMutable = (status: SettlementStatus) => status === 'DRAFT'

export const commissionStatusLabel = (status: CommissionEntryStatus) =>
  (
    ({
      AVAILABLE: 'Sin liquidar',
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

export const isOpenSettlement = (settlement: Pick<Settlement, 'status'>) =>
  settlement.status === 'DRAFT' || settlement.status === 'CLOSED'

export type NextSettlementAction = 'prepare' | 'review' | 'pay' | 'none'

export interface BarberDebt {
  barberId: string
  name: string
  availableCents: number
  availableCount: number
  open?: Settlement
  owedCents: number
  next: NextSettlementAction
}

// What the shop owes each contracted barber and the one step that moves it forward:
// prepare a settlement from loose commissions, review the open draft or pay it.
export const barberDebts = (
  barbers: { id: string; name: string }[],
  entries: CommissionEntry[] = [],
  settlements: Settlement[] = [],
): BarberDebt[] =>
  barbers
    .map((barber) => {
      const available = entries.filter(
        (entry) => entry.barberId === barber.id && entry.status === 'AVAILABLE',
      )
      const availableCents = available.reduce((sum, entry) => sum + entry.amountCents, 0)
      const open = settlements
        .filter((item) => item.barberId === barber.id && isOpenSettlement(item))
        .sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0]
      const next: NextSettlementAction = open
        ? open.status === 'DRAFT'
          ? 'review'
          : 'pay'
        : availableCents > 0
          ? 'prepare'
          : 'none'
      return {
        barberId: barber.id,
        name: barber.name,
        availableCents,
        availableCount: available.length,
        ...(open ? { open } : {}),
        owedCents: availableCents + (open?.payableTotalCents ?? 0),
        next,
      }
    })
    .sort((a, b) => b.owedCents - a.owedCents || a.name.localeCompare(b.name))

export const debtSummary = (debts: BarberDebt[]) => {
  const owing = debts.filter((debt) => debt.owedCents > 0)
  const totalCents = owing.reduce((sum, debt) => sum + debt.owedCents, 0)
  const readyToPay = debts.filter((debt) => debt.next === 'pay').length
  return { totalCents, barbers: owing.length, readyToPay }
}

// The barber's own view: money already grouped in an open settlement and money still loose.
export const personalBalance = (
  entries: CommissionEntry[] = [],
  settlements: Settlement[] = [],
) => {
  const looseCents = entries
    .filter((entry) => entry.status === 'AVAILABLE')
    .reduce((sum, entry) => sum + entry.amountCents, 0)
  const open = settlements.filter(isOpenSettlement)
  const inSettlementCents = open.reduce((sum, item) => sum + item.payableTotalCents, 0)
  const ready = open.find((item) => item.status === 'CLOSED')
  return {
    owedCents: looseCents + inSettlementCents,
    looseCents,
    inSettlementCents,
    ...(ready ? { ready } : {}),
  }
}

// Matches the backend cutoff: commissions earned up to the end of the chosen business day.
export const cutoffPreview = (entries: CommissionEntry[] = [], barberId: string, cutoff: string) =>
  entries
    .filter(
      (entry) =>
        entry.barberId === barberId &&
        entry.status === 'AVAILABLE' &&
        businessDateFromIso(entry.earnedAt) <= cutoff,
    )
    .reduce(
      (preview, entry) => ({ count: preview.count + 1, cents: preview.cents + entry.amountCents }),
      {
        count: 0,
        cents: 0,
      },
    )

export type CommissionFilter = CommissionEntryStatus | 'ALL'

export const commissionMatches = (
  entry: CommissionEntry,
  filter: CommissionFilter,
  barberId: string,
) => (filter === 'ALL' || entry.status === filter) && (!barberId || entry.barberId === barberId)

// Newest day first, newest entry first within the day.
export const entriesByDay = (entries: CommissionEntry[]) => {
  const days = new Map<string, CommissionEntry[]>()
  for (const entry of [...entries].sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))) {
    const day = businessDateFromIso(entry.earnedAt)
    days.set(day, [...(days.get(day) ?? []), entry])
  }
  return [...days].map(([date, items]) => ({
    date,
    items,
    totalCents: items.reduce((sum, item) => sum + item.amountCents, 0),
  }))
}

export const settlementItemsSummary = (items: Pick<SettlementItem, 'type'>[]) => {
  const reversals = items.filter((item) => item.type === 'REVERSAL').length
  const earnings = items.length - reversals
  const parts = [`${earnings} ${earnings === 1 ? 'comisión' : 'comisiones'}`]
  if (reversals > 0) parts.push(`${reversals} ${reversals === 1 ? 'corrección' : 'correcciones'}`)
  return parts.join(' y ')
}
