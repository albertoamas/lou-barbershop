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
export const paymentMatches = (total: number, cash: number, qr: number) =>
  cash >= 0 && qr >= 0 && cash + qr === total
export const paymentDifference = (total: number, cash: number, qr: number) => total - cash - qr
export const operationStep = (operation?: Pick<Operation, 'status'>) => {
  if (!operation) return 1
  if (operation.status === 'DRAFT') return 2
  if (operation.status === 'READY_TO_PAY') return 4
  return 5
}
export const paymentDraftFor = (
  currentOperationId: string | undefined,
  nextOperationId: string,
  current: { cash: number; qr: number },
) => (currentOperationId === nextOperationId ? current : { cash: 0, qr: 0 })
export const operationStatus = (value: OperationStatus) =>
  (
    ({
      DRAFT: 'En preparación',
      READY_TO_PAY: 'Lista para cobrar',
      PAID: 'Pagada',
      REVERSED: 'Revertida',
    }) as const
  )[value]
