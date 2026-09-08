import type { PaymentMethod } from '../sales/Sales'

export type MovementType =
  | 'OPENING'
  | 'PURCHASE_RECEIPT'
  | 'SALE'
  | 'SALE_REVERSAL'
  | 'COUNT_ADJUSTMENT'
  | 'DAMAGE'
  | 'LOSS'
  | 'INTERNAL_USE'

export interface InventoryItem {
  productId: string
  name: string
  sku?: string
  salePriceCents: number
  averageCostCents?: number
  quantity: number
  minimumStock: number
  lowStock: boolean
  active: boolean
}

export interface Receipt {
  id: string
  receiptDate: string
  paymentMethod: PaymentMethod
  totalCents: number
  reference?: string
  note?: string
  status: 'CONFIRMED' | 'REVERSED'
  items: {
    id: string
    productId: string
    productName: string
    quantity: number
    unitCostCents: number
    lineTotalCents: number
  }[]
}

export interface Expense {
  id: string
  categoryId: string
  categoryName: string
  expenseDate: string
  description: string
  amountCents: number
  paymentMethod: PaymentMethod
  status: 'RECORDED' | 'VOIDED'
  voidReason?: string
  version: number
}

export interface CashFlow {
  dateFrom: string
  dateTo: string
  salesCashCents: number
  salesQrCents: number
  inventoryCashCents: number
  inventoryQrCents: number
  expenseCashCents: number
  expenseQrCents: number
  netCashCents: number
  netQrCents: number
}

export const receiptTotal = (items: { quantity: number; unitCostCents: number }[]) =>
  items.reduce((total, item) => total + item.quantity * item.unitCostCents, 0)
