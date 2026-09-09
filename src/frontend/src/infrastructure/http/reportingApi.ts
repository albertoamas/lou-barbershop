import type {
  AuditPage,
  BarberPerformance,
  DailyDashboard,
  PeriodReport,
} from '../../core/reporting/Reporting'
import { apiRequest } from './apiClient'

const query = (from: string, to: string) =>
  `dateFrom=${encodeURIComponent(from)}&dateTo=${encodeURIComponent(to)}`

export const reportingApi = {
  daily: (date: string) =>
    apiRequest<DailyDashboard>(`/api/v1/reports/daily?date=${encodeURIComponent(date)}`),
  period: (from: string, to: string) =>
    apiRequest<PeriodReport>(`/api/v1/reports/period?${query(from, to)}`),
  barbers: (from: string, to: string) =>
    apiRequest<BarberPerformance[]>(`/api/v1/reports/barber-performance?${query(from, to)}`),
  audit: (from: string, to: string, entityType: string, page: number) =>
    apiRequest<AuditPage>(
      `/api/v1/audit?${query(from, to)}&entityType=${encodeURIComponent(entityType)}&page=${page}&pageSize=25`,
    ),
  exportUrl: (report: 'period' | 'barbers', from: string, to: string) =>
    `/api/v1/reports/export?report=${report}&${query(from, to)}`,
}
