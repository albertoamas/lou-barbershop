import type {
  CommissionEntry,
  CommissionEntryStatus,
  Settlement,
} from '../../core/commissions/Commissions'
import type { PaymentMethod } from '../../core/sales/Sales'
import { apiRequest, secureApiRequest } from './apiClient'

export const commissionApi = {
  commissions: (barberId?: string, status?: CommissionEntryStatus) => {
    const query = new URLSearchParams()
    if (barberId) query.set('barberId', barberId)
    if (status) query.set('status', status)
    const suffix = query.size ? `?${query}` : ''
    return apiRequest<CommissionEntry[]>(`/api/v1/commissions${suffix}`)
  },
  settlements: (barberId?: string) =>
    apiRequest<Settlement[]>(
      `/api/v1/settlements${barberId ? `?${new URLSearchParams({ barberId })}` : ''}`,
    ),
  read: (id: string) => apiRequest<Settlement>(`/api/v1/settlements/${id}`),
  create: (barberId: string, periodEnd: string) =>
    secureApiRequest<Settlement>('/api/v1/settlements', 'POST', { barberId, periodEnd }),
  adjust: (value: Settlement, amountCents: number, reason: string) =>
    secureApiRequest<Settlement>(`/api/v1/settlements/${value.id}/adjustments`, 'POST', {
      version: value.version,
      amountCents,
      reason,
    }),
  close: (value: Settlement) =>
    secureApiRequest<Settlement>(`/api/v1/settlements/${value.id}/close`, 'POST', {
      version: value.version,
    }),
  pay: (value: Settlement, paymentDate: string, method: PaymentMethod) =>
    secureApiRequest<Settlement>(`/api/v1/settlements/${value.id}/pay`, 'POST', {
      version: value.version,
      paymentDate,
      method,
    }),
}
