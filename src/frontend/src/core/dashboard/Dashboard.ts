import type { AppointmentStatus } from '../agenda/Agenda'
import type { CommissionEntry } from '../commissions/Commissions'

export type DashboardRole = 'OWNER' | 'ADMIN' | 'BARBER'

export interface DashboardAppointment {
  id: string
  customerName: string
  barberName: string
  serviceName: string
  status: string
  startsAt: string
}

const activeStatuses: ReadonlySet<string> = new Set<AppointmentStatus>([
  'CONFIRMED',
  'CHECKED_IN',
  'IN_SERVICE',
])

export const dashboardRoleFor = (roles: string[]): DashboardRole => {
  if (roles.includes('OWNER')) return 'OWNER'
  if (roles.includes('ADMIN')) return 'ADMIN'
  return 'BARBER'
}

export const availableCommissionCents = (entries: CommissionEntry[] = []) =>
  entries
    .filter((entry) => entry.status === 'AVAILABLE')
    .reduce((total, entry) => total + entry.amountCents, 0)

export const activeAppointments = (appointments: DashboardAppointment[] = []) =>
  appointments.filter((appointment) => activeStatuses.has(appointment.status))

export const nextAppointment = (appointments: DashboardAppointment[] = [], now = new Date()) =>
  activeAppointments(appointments)
    .filter((appointment) => new Date(appointment.startsAt).getTime() >= now.getTime())
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))[0]
