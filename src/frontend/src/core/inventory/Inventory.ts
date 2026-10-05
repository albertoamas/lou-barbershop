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

export const receiptTotal = (items: { quantity: number; unitCostCents: number }[]) =>
  items.reduce((total, item) => total + item.quantity * item.unitCostCents, 0)

// Stock state for the list: out of stock is told apart from low stock.
export type StockStatus = 'OUT' | 'LOW' | 'OK' | 'INACTIVE'

export const stockStatus = (item: Pick<InventoryItem, 'active' | 'quantity' | 'lowStock'>) =>
  !item.active ? 'INACTIVE' : item.quantity <= 0 ? 'OUT' : item.lowStock ? 'LOW' : 'OK'

export const stockStatusLabel: Record<StockStatus, string> = {
  OUT: 'Agotado',
  LOW: 'Stock bajo',
  OK: 'En orden',
  INACTIVE: 'Inactivo',
}

export type StockFilter = 'ALL' | 'LOW' | 'OUT'

export const stockMatches = (item: InventoryItem, filter: StockFilter, search: string) => {
  const status = stockStatus(item)
  const term = search.trim().toLocaleLowerCase('es-BO')
  const matchesSearch =
    !term || `${item.name} ${item.sku ?? ''}`.toLocaleLowerCase('es-BO').includes(term)
  if (!matchesSearch) return false
  if (filter === 'OUT') return status === 'OUT'
  if (filter === 'LOW') return status === 'LOW' || status === 'OUT'
  return true
}

// How full the stock is against its minimum, capped at 100 for the bar.
export const stockLevel = (item: Pick<InventoryItem, 'quantity' | 'minimumStock'>) =>
  item.minimumStock <= 0
    ? 100
    : Math.min(100, Math.round((Math.max(item.quantity, 0) / (item.minimumStock * 2)) * 100))

export type AdjustmentKind = Extract<
  MovementType,
  'COUNT_ADJUSTMENT' | 'DAMAGE' | 'LOSS' | 'INTERNAL_USE'
>

// The quantity change sent to the backend, from what the person typed: the units
// counted now for a count, or the units that left for damage, loss or internal use.
// Never asks for a signed number. Undefined when the input is not a valid count.
export const adjustmentDelta = (kind: AdjustmentKind, current: number, typed: string) => {
  if (!/^\d+$/.test(typed.trim())) return undefined
  const units = Number(typed.trim())
  if (kind === 'COUNT_ADJUSTMENT') return units - current
  return units > 0 ? -units : undefined
}
