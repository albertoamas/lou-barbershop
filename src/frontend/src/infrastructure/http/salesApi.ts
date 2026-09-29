import type { DailyOperations, Operation, PaymentMethod } from '../../core/sales/Sales'
import { apiRequest, secureApiRequest } from './apiClient'
export const salesApi = {
  ownBarber: () => apiRequest<{ barberId: string }>('/api/v1/operations/own-barber'),
  read: (id: string) => apiRequest<Operation>(`/api/v1/operations/${id}`),
  daily: (date: string) =>
    apiRequest<DailyOperations>(`/api/v1/operations/daily?${new URLSearchParams({ date })}`),
  openWalkIn: (customerId: string, barberId: string) =>
    secureApiRequest<Operation>('/api/v1/operations', 'POST', { customerId, barberId }),
  openAppointment: (id: string) =>
    secureApiRequest<Operation>(`/api/v1/appointments/${id}/operation`, 'POST'),
  services: (value: Operation, serviceIds: string[]) =>
    secureApiRequest<Operation>(`/api/v1/operations/${value.id}/services`, 'PUT', {
      version: value.version,
      services: serviceIds.map((serviceId) => ({ serviceId })),
    }),
  products: (value: Operation, products: { productId: string; quantity: number }[]) =>
    secureApiRequest<Operation>(`/api/v1/operations/${value.id}/products`, 'PUT', {
      version: value.version,
      products,
    }),
  adjust: (value: Operation, discountCents: number, courtesy: boolean, reason: string) =>
    secureApiRequest<Operation>(`/api/v1/operations/${value.id}/adjustments`, 'POST', {
      version: value.version,
      discountCents,
      courtesy,
      reason,
    }),
  ready: (value: Operation) =>
    secureApiRequest<Operation>(`/api/v1/operations/${value.id}/ready`, 'POST', {
      version: value.version,
    }),
  pay: async (
    value: Operation,
    payments: { method: PaymentMethod; amountCents: number }[],
    key: string,
  ) => {
    const { token } = await apiRequest<{ token: string }>('/api/v1/auth/antiforgery')
    return apiRequest<Operation>(`/api/v1/operations/${value.id}/pay`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': token,
        'Idempotency-Key': key,
      },
      body: JSON.stringify({ version: value.version, payments }),
    })
  },
  reverse: (value: Operation, reason: string) =>
    secureApiRequest<boolean>(`/api/v1/operations/${value.id}/reverse`, 'POST', {
      version: value.version,
      reason,
    }),
}
