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

// Greeting by the shop's local hour (America/La_Paz), whatever the device's zone.
export const greetingFor = (now: Date) => {
  const hour = Number(
    new Intl.DateTimeFormat('es-BO', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      hour12: false,
    }).format(now),
  )
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

export interface DayCounts {
  waiting: number
  inService: number
  upcoming: number
  pendingCharges: number
}

// What needs someone now: customers waiting, in the chair, still to arrive and to charge.
// Pending charges count open and ready attentions, as the charge screen does.
export const dayCounts = (
  appointments: DashboardAppointment[] = [],
  operationStatuses: string[] = [],
  now = new Date(),
): DayCounts => ({
  waiting: appointments.filter((item) => item.status === 'CHECKED_IN').length,
  inService: appointments.filter((item) => item.status === 'IN_SERVICE').length,
  upcoming: upcomingAppointments(appointments, now, Number.POSITIVE_INFINITY).length,
  pendingCharges: operationStatuses.filter(
    (status) => status === 'DRAFT' || status === 'READY_TO_PAY',
  ).length,
})

// Confirmed appointments that have not started yet, soonest first.
export const upcomingAppointments = (
  appointments: DashboardAppointment[] = [],
  now = new Date(),
  limit = 5,
) =>
  appointments
    .filter(
      (item) => item.status === 'CONFIRMED' && new Date(item.startsAt).getTime() >= now.getTime(),
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
    .slice(0, limit)

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// One plain sentence with what is pending, written with words and commas.
export const statusSentence = ({ waiting, inService, pendingCharges }: DayCounts) => {
  const parts = [
    waiting > 0 ? plural(waiting, 'cliente esperando', 'clientes esperando') : '',
    inService > 0 ? `${inService} en atención` : '',
    pendingCharges > 0 ? `${pendingCharges} por cobrar` : '',
  ].filter(Boolean)
  return parts.length === 0 ? 'Nada pendiente por ahora.' : `${parts.join(', ')}.`
}
