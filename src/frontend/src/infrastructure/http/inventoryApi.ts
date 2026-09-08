import type {
  CashFlow,
  Expense,
  InventoryItem,
  MovementType,
  Receipt,
} from '../../core/inventory/Inventory'
import type { PaymentMethod } from '../../core/sales/Sales'
import { apiRequest, secureApiRequest } from './apiClient'

export const inventoryApi = {
  inventory: () => apiRequest<InventoryItem[]>('/api/v1/inventory'),
  receipts: () => apiRequest<Receipt[]>('/api/v1/inventory-receipts'),
  receive: (input: {
    receiptDate: string
    paymentMethod: PaymentMethod
    reference?: string
    note?: string
    items: { productId: string; quantity: number; unitCostCents: number }[]
  }) => secureApiRequest<Receipt>('/api/v1/inventory-receipts', 'POST', input),
  adjust: (
    productId: string,
    input: { quantityDelta: number; type: MovementType; reason: string },
  ) => secureApiRequest<InventoryItem>(`/api/v1/products/${productId}/adjustments`, 'POST', input),
  expenses: () => apiRequest<Expense[]>('/api/v1/expenses'),
  createExpense: (input: {
    categoryId: string
    expenseDate: string
    description: string
    amountCents: number
    paymentMethod: PaymentMethod
  }) => secureApiRequest<Expense>('/api/v1/expenses', 'POST', input),
  voidExpense: (expense: Expense, reason: string) =>
    secureApiRequest<Expense>(`/api/v1/expenses/${expense.id}/void`, 'POST', {
      version: expense.version,
      reason,
    }),
  cashFlow: (dateFrom: string, dateTo: string) =>
    apiRequest<CashFlow>(`/api/v1/cash-flow?${new URLSearchParams({ dateFrom, dateTo })}`),
}
