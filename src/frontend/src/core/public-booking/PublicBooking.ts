import type { AvailabilitySlot } from '../scheduling/Scheduling'

export interface PublicService {
  id: string
  name: string
  description: string | null
  durationMinutes: number
  priceCents: number
}
export interface PublicBarber {
  id: string
  displayName: string
}
export interface PublicCatalog {
  services: PublicService[]
  barbers: PublicBarber[]
}
export type PublicAppointmentStatus =
  'CONFIRMED' | 'CHECKED_IN' | 'IN_SERVICE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW'
export interface PublicAppointment {
  id: string
  customerName: string
  serviceId: string
  serviceName: string
  barberId: string
  barberName: string
  startsAt: string
  endsAt: string
  status: PublicAppointmentStatus
  priceCents: number
  durationMinutes: number
  version: number
}
export interface PublicBookingConfirmation {
  appointment: PublicAppointment
  managementToken: string
  managementPath: string
}
export interface PublicBookingInput {
  serviceId: string
  barberId: string
  startsAt: string
  displayName: string
  phone: string
  privacyAccepted: boolean
}
export interface PublicBookingPort {
  catalog(): Promise<PublicCatalog>
  availability(serviceId: string, barberId: string, date: string): Promise<AvailabilitySlot[]>
  create(input: PublicBookingInput): Promise<PublicBookingConfirmation>
  read(token: string): Promise<PublicAppointment>
  reschedule(
    token: string,
    appointment: PublicAppointment,
    slot: AvailabilitySlot,
  ): Promise<PublicBookingConfirmation>
  cancel(token: string, appointment: PublicAppointment): Promise<PublicAppointment>
}

export const appointmentStatusLabel: Record<PublicAppointmentStatus, string> = {
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'Llegada registrada',
  IN_SERVICE: 'En atención',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No asistió',
}

export const managementTokenFromHash = (hash: string): string => {
  const value = hash.startsWith('#') ? hash.slice(1) : hash
  return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : ''
}
