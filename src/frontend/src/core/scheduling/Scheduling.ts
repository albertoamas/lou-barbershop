export type ExceptionKind = 'UNAVAILABLE' | 'AVAILABLE_OVERRIDE'

export interface AvailableBarber {
  id: string
  displayName: string
  color?: string
}

export interface AvailableService {
  id: string
  name: string
  defaultDurationMinutes: number
  defaultPriceCents: number
  active: boolean
}

export interface AvailabilitySlot {
  barberId: string
  barberName: string
  serviceId: string
  startsAt: string
  endsAt: string
  durationMinutes: number
  priceCents: number
}

export interface WorkingSchedule {
  id: string
  barberId: string
  weekday: number
  startLocalTime: string
  endLocalTime: string
  validFrom: string
  validTo?: string
  active: boolean
  version: number
}

export interface AvailabilityException {
  id: string
  barberId: string
  startsAt: string
  endsAt: string
  kind: ExceptionKind
  reason: string
  active: boolean
  version: number
}

export interface AppointmentConflict {
  appointmentId: string
  startsAt: string
  endsAt: string
}

export interface ScheduleChange {
  schedule: WorkingSchedule
  conflicts: AppointmentConflict[]
}

export interface ExceptionChange {
  exception: AvailabilityException
  conflicts: AppointmentConflict[]
}

export interface SchedulingPort {
  listBarbers(): Promise<AvailableBarber[]>
  listServices(): Promise<AvailableService[]>
  search(input: {
    serviceId: string
    barberId: string
    dateFrom: string
    dateTo: string
  }): Promise<AvailabilitySlot[]>
  listSchedules(barberId: string): Promise<WorkingSchedule[]>
  createSchedule(
    barberId: string,
    input: Omit<WorkingSchedule, 'id' | 'barberId' | 'active' | 'version'>,
  ): Promise<ScheduleChange>
  updateSchedule(schedule: WorkingSchedule, active: boolean): Promise<ScheduleChange>
  listExceptions(barberId: string): Promise<AvailabilityException[]>
  createException(
    barberId: string,
    input: { startsAt: string; endsAt: string; kind: ExceptionKind; reason: string },
  ): Promise<ExceptionChange>
  deactivateException(exceptionRule: AvailabilityException): Promise<ExceptionChange>
}

const localDateParts = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/La_Paz',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)

export const todayInBusinessTime = (now = new Date()) => localDateParts(now)

export const addCalendarDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

export const businessLocalToIso = (value: string) => `${value}:00-04:00`

export const weekdayLabels = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]
