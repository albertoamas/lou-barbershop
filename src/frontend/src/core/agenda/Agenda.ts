import type { AvailabilitySlot } from '../scheduling/Scheduling'

export const agendaTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))

export const agendaDate = (value: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))

export type AppointmentStatus =
  'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export interface Customer {
  id: string
  displayName: string
  phone: string
  notes: string | null
  version: number
}
export type CustomerInput = Pick<Customer, 'displayName' | 'phone' | 'notes'>
export interface CustomerChange {
  customer: Customer
  possibleDuplicates: Customer[]
}
export interface Appointment {
  id: string
  customerId: string
  customerName: string
  barberId: string
  barberName: string
  serviceId: string
  serviceName: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  quotedPriceCents: number | null
  quotedDurationMinutes: number
  version: number
}
export interface AppointmentInput {
  customerId: string
  barberId: string
  serviceId: string
  startsAt: string
}
export interface AppointmentSnapshot {
  barberId: string
  serviceId: string
  startsAt: string
  endsAt: string
  status: AppointmentStatus
  priceCents: number
  durationMinutes: number
}
export interface AgendaEvent {
  id: string
  actorId: string
  occurredAt: string
  action: string
  reason: string | null
  before: AppointmentSnapshot | null
  after: AppointmentSnapshot
}
export type AgendaAction = 'cancel' | 'no-show' | 'check-in' | 'start'
export interface AgendaPort {
  customers(query: string): Promise<Customer[]>
  saveCustomer(input: CustomerInput, existing?: Customer): Promise<CustomerChange>
  list(dateFrom: string, dateTo: string, barberId?: string): Promise<Appointment[]>
  create(input: AppointmentInput): Promise<Appointment>
  reschedule(
    appointment: Appointment,
    input: Omit<AppointmentInput, 'customerId'>,
    reason: string,
  ): Promise<Appointment>
  transition(appointment: Appointment, action: AgendaAction, reason?: string): Promise<Appointment>
  history(id: string): Promise<AgendaEvent[]>
  alternatives(
    id: string,
    serviceId: string,
    barberId: string,
    date: string,
  ): Promise<AvailabilitySlot[]>
}
export const statusLabels: Record<AppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'Cliente llegó',
  IN_SERVICE: 'En atención',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}

export const sortAppointments = (appointments: Appointment[]) =>
  [...appointments].sort((left, right) => left.startsAt.localeCompare(right.startsAt))

export const appointmentsForDate = (appointments: Appointment[], date: string) =>
  sortAppointments(appointments.filter((appointment) => agendaDate(appointment.startsAt) === date))

export const overlapsAnotherAppointment = (appointment: Appointment, appointments: Appointment[]) =>
  appointments.some(
    (candidate) =>
      candidate.id !== appointment.id &&
      candidate.barberId === appointment.barberId &&
      !['CANCELLED', 'NO_SHOW'].includes(candidate.status) &&
      !['CANCELLED', 'NO_SHOW'].includes(appointment.status) &&
      appointment.startsAt < candidate.endsAt &&
      appointment.endsAt > candidate.startsAt,
  )
export const agendaActions = (status: AppointmentStatus, canManage: boolean): AgendaAction[] => {
  if (status === 'CONFIRMED') return canManage ? ['check-in', 'cancel', 'no-show'] : ['check-in']
  if (status === 'CHECKED_IN') return canManage ? ['start', 'cancel'] : ['start']
  return []
}
