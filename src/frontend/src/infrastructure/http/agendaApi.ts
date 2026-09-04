import type { AgendaPort } from '../../core/agenda/Agenda'
import { apiRequest, secureApiRequest } from './apiClient'

export const agendaApi: AgendaPort = {
  customers: (query) => apiRequest(`/api/v1/customers?${new URLSearchParams({ query })}`),
  saveCustomer: (input, existing) =>
    existing
      ? secureApiRequest(`/api/v1/customers/${existing.id}`, 'PATCH', {
          ...input,
          version: existing.version,
        })
      : secureApiRequest('/api/v1/customers', 'POST', input),
  list: (dateFrom, dateTo, barberId) =>
    apiRequest(
      `/api/v1/appointments?${new URLSearchParams({ dateFrom, dateTo, ...(barberId ? { barberId } : {}) })}`,
    ),
  create: (input) => secureApiRequest('/api/v1/appointments', 'POST', input),
  reschedule: (appointment, input, reason) =>
    secureApiRequest(`/api/v1/appointments/${appointment.id}/reschedule`, 'PATCH', {
      ...input,
      reason,
      version: appointment.version,
    }),
  transition: (appointment, action, reason) =>
    secureApiRequest(`/api/v1/appointments/${appointment.id}/${action}`, 'POST', {
      version: appointment.version,
      reason,
    }),
  history: (id) => apiRequest(`/api/v1/appointments/${id}/events`),
  alternatives: (id, serviceId, barberId, date) =>
    apiRequest(
      `/api/v1/appointments/${id}/availability?${new URLSearchParams({ serviceId, date, ...(barberId !== 'any' ? { barberId } : {}) })}`,
    ),
}
