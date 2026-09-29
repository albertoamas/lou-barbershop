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

export interface InventoryMovement {
  id: string
  productId: string
  type: MovementType
  quantityDelta: number
  unitCostCents: number
  reason?: string
  occurredAt: string
}

export const movementLabel = (type: MovementType) =>
  (
    ({
      OPENING: 'Saldo inicial',
      PURCHASE_RECEIPT: 'Compra recibida',
      SALE: 'Venta',
      SALE_REVERSAL: 'Reverso de venta',
      COUNT_ADJUSTMENT: 'Ajuste por conteo',
      DAMAGE: 'Daño o baja',
      LOSS: 'Pérdida',
      INTERNAL_USE: 'Uso interno',
    }) as const
  )[type]

export const stockAlerts = (items: InventoryItem[] | undefined) =>
  (items ?? []).filter((item) => item.active && item.lowStock)

export const filterStock = (items: InventoryItem[] | undefined, search: string, onlyLow: boolean) =>
  (items ?? []).filter((item) => {
    const matchesSearch = `${item.name} ${item.sku ?? ''}`
      .toLocaleLowerCase('es-BO')
      .includes(search.trim().toLocaleLowerCase('es-BO'))
    return matchesSearch && (!onlyLow || (item.active && item.lowStock))
  })

export const receiptTotal = (items: { quantity: number; unitCostCents: number }[]) =>
  items.reduce((total, item) => total + item.quantity * item.unitCostCents, 0)
