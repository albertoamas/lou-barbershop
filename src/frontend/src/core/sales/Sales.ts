export type OperationStatus = 'DRAFT' | 'READY_TO_PAY' | 'PAID' | 'REVERSED'
export type PaymentMethod = 'CASH' | 'QR'
export interface SaleItem {
  id: string
  type: 'SERVICE' | 'PRODUCT'
  serviceId?: string
  productId?: string
  description: string
  unitPriceCents: number
  unitCostCents: number
  quantity: number
}
export interface Payment {
  id: string
  method: PaymentMethod
  amountCents: number
}
export interface Operation {
  id: string
  appointmentId?: string
  customerId: string
  customerName: string
  barberId: string
  barberName: string
  origin: 'APPOINTMENT' | 'WALK_IN'
  status: OperationStatus
  subtotalCents: number
  discountCents: number
  courtesyCents: number
  totalCents: number
  adjustmentReason?: string
  reversalReason?: string
  reversedAt?: string
  version: number
  items: SaleItem[]
  payments: Payment[]
}
export interface DailyOperations {
  date: string
  draftCount: number
  paidCount: number
  totalCents: number
  cashCents: number
  qrCents: number
  operations: Operation[]
}
export const operationStatus = (value: OperationStatus) =>
  (
    ({
      DRAFT: 'En preparación',
      READY_TO_PAY: 'Lista para cobrar',
      PAID: 'Pagada',
      REVERSED: 'Revertida',
    }) as const
  )[value]

// Waiting to be charged: consumption still open or total confirmed but unpaid.
export const isPendingOperation = (operation: Pick<Operation, 'status'>) =>
  operation.status === 'DRAFT' || operation.status === 'READY_TO_PAY'

export type PaymentChoice = 'CASH' | 'QR' | 'MIXED'

// Cash and QR amounts for a payment choice. "Mixed" takes the cash typed and leaves the
// rest to QR; the backend still checks that both add up to the total it calculated.
export const paymentSplit = (choice: PaymentChoice, totalCents: number, mixedCashCents = 0) => {
  if (choice === 'CASH') return { cash: totalCents, qr: 0 }
  if (choice === 'QR') return { cash: 0, qr: totalCents }
  const cash = Math.min(Math.max(mixedCashCents, 0), totalCents)
  return { cash, qr: totalCents - cash }
}

// Change to hand back when the customer gives more cash than is due. A counter aid
// only: it is never sent or stored. Negative means cash is still missing.
export const cashChange = (cashDueCents: number, receivedCents: number) =>
  receivedCents - cashDueCents

// The three steps shown on screen: what was done, review and charge, done.
export type OperationStage = 'consumption' | 'checkout' | 'done'

export const stageOf = (
  operation: Pick<Operation, 'status'>,
  reviewing: boolean,
): OperationStage =>
  operation.status === 'DRAFT'
    ? reviewing
      ? 'checkout'
      : 'consumption'
    : operation.status === 'READY_TO_PAY'
      ? 'checkout'
      : 'done'
