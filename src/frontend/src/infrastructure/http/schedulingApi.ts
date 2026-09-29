import type { SchedulingPort } from '../../core/scheduling/Scheduling'
import { apiRequest, secureApiRequest } from './apiClient'

export const schedulingApi: SchedulingPort = {
  listBarbers: () => apiRequest('/api/v1/availability/barbers'),
  listServices: () => apiRequest('/api/v1/services'),
  search: ({ serviceId, barberId, dateFrom, dateTo }) => {
    const query = new URLSearchParams({ serviceId, barberId, dateFrom, dateTo })
    return apiRequest(`/api/v1/availability?${query.toString()}`)
  },
  listSchedules: (barberId) => apiRequest(`/api/v1/barbers/${barberId}/schedules`),
  createSchedule: (barberId, input) =>
    secureApiRequest(`/api/v1/barbers/${barberId}/schedules`, 'POST', input),
  updateSchedule: (schedule, input) =>
    secureApiRequest(`/api/v1/barbers/${schedule.barberId}/schedules/${schedule.id}`, 'PATCH', {
      ...input,
      version: schedule.version,
    }),
  listExceptions: (barberId) => apiRequest(`/api/v1/barbers/${barberId}/availability-exceptions`),
  createException: (barberId, input) =>
    secureApiRequest(`/api/v1/barbers/${barberId}/availability-exceptions`, 'POST', input),
  deactivateException: (exceptionRule) =>
    secureApiRequest(
      `/api/v1/barbers/${exceptionRule.barberId}/availability-exceptions/${exceptionRule.id}/deactivate`,
      'POST',
      { version: exceptionRule.version },
    ),
}
