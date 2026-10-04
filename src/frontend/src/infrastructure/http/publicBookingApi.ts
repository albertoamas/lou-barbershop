import type { PublicBookingPort } from '../../core/public-booking/PublicBooking'
import { apiRequest, secureApiRequest } from './apiClient'

const tokenHeader = (token: string) => ({ 'X-Management-Token': token })

export const publicBookingApi: PublicBookingPort = {
  catalog: () => apiRequest('/api/v1/public/catalog'),
  availabilityRange: (serviceId, barberId, dateFrom, dateTo) =>
    apiRequest(
      `/api/v1/public/availability?${new URLSearchParams({ serviceId, barberId, dateFrom, dateTo })}`,
    ),
  create: (input) => secureApiRequest('/api/v1/public/appointments', 'POST', input),
  read: (token) =>
    apiRequest('/api/v1/public/appointments/manage', { headers: tokenHeader(token) }),
  reschedule: (token, appointment, slot) =>
    secureApiRequest(
      '/api/v1/public/appointments/manage',
      'PATCH',
      {
        serviceId: slot.serviceId,
        barberId: slot.barberId,
        startsAt: slot.startsAt,
        version: appointment.version,
      },
      tokenHeader(token),
    ),
  cancel: (token, appointment) =>
    secureApiRequest(
      '/api/v1/public/appointments/manage/cancel',
      'POST',
      { version: appointment.version },
      tokenHeader(token),
    ),
}
