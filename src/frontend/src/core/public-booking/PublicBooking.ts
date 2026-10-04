import {
  addCalendarDays,
  todayInBusinessTime,
  type AvailabilitySlot,
} from '../scheduling/Scheduling'

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
  // Free times over a range of business dates, inclusive.
  availabilityRange(
    serviceId: string,
    barberId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<AvailabilitySlot[]>
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

export const managementTokenFromInput = (input: string): string => {
  const value = input.trim()
  const directToken = managementTokenFromHash(value)
  if (directToken) return directToken

  try {
    const url = new URL(value, 'https://lou-barbershop.invalid')
    if (!url.pathname.endsWith('/mi-cita')) return ''
    return managementTokenFromHash(url.hash)
  } catch {
    return ''
  }
}

export type ServiceGroup = 'CUTS' | 'BEARD' | 'DETAILS'

// Groups the public catalog for the home by what each service is about, read from its
// name: haircuts, beard and razor work, and finishing details.
export const serviceGroupOf = (name: string): ServiceGroup => {
  const value = name.toLocaleLowerCase('es')
  if (value.includes('corte')) return 'CUTS'
  if (value.includes('barba') || value.includes('afeitado') || value.includes('navaja'))
    return 'BEARD'
  return 'DETAILS'
}

// Month calendar of the booking: weeks from Monday, with empty cells before the 1st and
// after the last day. A month is written "YYYY-MM"; days are "YYYY-MM-DD".
export const monthOf = (date: string) => date.slice(0, 7)

export const shiftMonth = (month: string, delta: number) => {
  const [year = 0, index = 1] = month.split('-').map(Number)
  const value = new Date(Date.UTC(year, index - 1 + delta, 1))
  return value.toISOString().slice(0, 7)
}

export const monthRange = (month: string) => {
  const first = `${month}-01`
  return { first, last: addCalendarDays(`${shiftMonth(month, 1)}-01`, -1) }
}

export const monthWeeks = (month: string): (string | undefined)[][] => {
  const { first, last } = monthRange(month)
  // getUTCDay: Sunday 0; shifted so Monday opens the week.
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7
  const cells: (string | undefined)[] = Array.from({ length: lead }, () => undefined)
  for (let day = first; day <= last; day = addCalendarDays(day, 1)) cells.push(day)
  while (cells.length % 7 !== 0) cells.push(undefined)
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7))
}

// Business date (America/La_Paz) on which a slot starts.
export const slotDate = (slot: Pick<AvailabilitySlot, 'startsAt'>) =>
  todayInBusinessTime(new Date(slot.startsAt))

export const datesWithSlots = (slots: AvailabilitySlot[] = []) => new Set(slots.map(slotDate))

const slotHour = (slot: Pick<AvailabilitySlot, 'startsAt'>) =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      hour12: false,
    }).format(new Date(slot.startsAt)),
  )

// Free times of one day, one per start time (any barber), split into morning and
// afternoon so both can be shown at once.
export const daySlots = (slots: AvailabilitySlot[] = [], date: string) => {
  const byTime = new Map<string, AvailabilitySlot>()
  for (const slot of [...slots].sort((left, right) => left.startsAt.localeCompare(right.startsAt)))
    if (slotDate(slot) === date && !byTime.has(slot.startsAt)) byTime.set(slot.startsAt, slot)
  const unique = [...byTime.values()]
  return {
    morning: unique.filter((slot) => slotHour(slot) < 13),
    afternoon: unique.filter((slot) => slotHour(slot) >= 13),
  }
}

const icsDate = (value: Date) =>
  value
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')
const icsText = (value: string) =>
  value.replace(/[\\,;]/g, (match) => `\\${match}`).replace(/\n/g, '\\n')

// A calendar file (iCalendar) for the confirmed appointment, so the customer can save it
// in their phone's calendar. Built on the device; nothing is sent anywhere.
export const calendarEvent = (input: {
  id: string
  title: string
  startsAt: string
  durationMinutes: number
  location: string
  description: string
}) => {
  const start = new Date(input.startsAt)
  const end = new Date(start.getTime() + input.durationMinutes * 60_000)
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lou Barbershop//Reservas//ES',
    'BEGIN:VEVENT',
    `UID:${input.id}@lou-barbershop`,
    `DTSTAMP:${icsDate(start)}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(input.title)}`,
    `LOCATION:${icsText(input.location)}`,
    `DESCRIPTION:${icsText(input.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

// A friendly countdown to the appointment day, in business dates.
export const appointmentCountdown = (today: string, date: string) => {
  const days = Math.round(
    (Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000,
  )
  if (days < 0) return undefined
  if (days === 0) return 'Es hoy'
  if (days === 1) return 'Es mañana'
  return `Faltan ${days} días`
}
