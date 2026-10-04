import {
  businessDateFromIso,
  businessLocalToIso,
  type AvailabilityException,
  type WorkingSchedule,
} from './Scheduling'

// The shop's two opening windows (RN-AGEN-11) as one-tap shift presets.
export const shiftPresets = [
  { id: 'MORNING', label: 'Mañana', start: '08:00', end: '13:00' },
  { id: 'AFTERNOON', label: 'Tarde', start: '15:00', end: '21:00' },
] as const

// "08:00 a 13:00": ranges are written with words, never dashes (plan section 5.2.1).
export const timeRangeText = (start: string, end: string) =>
  `${start.slice(0, 5)} a ${end.slice(0, 5)}`

// "lun 6 oct" for a business date (YYYY-MM-DD).
export const shortBusinessDate = (date: string) => {
  const parts = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).formatToParts(new Date(`${date}T12:00:00Z`))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    (parts.find((item) => item.type === type)?.value ?? '').replace(/\./g, '')
  return `${part('weekday')} ${part('day')} ${part('month')}`
}

const isCurrent = (schedule: WorkingSchedule, today: string) =>
  schedule.active && (!schedule.validTo || schedule.validTo >= today)

// Shifts of one weekday (1 Monday to 7 Sunday) still in force or starting later, by
// start time. Inactive or ended shifts go to the history.
export const shiftsOn = (schedules: WorkingSchedule[], weekday: number, today: string) =>
  schedules
    .filter((schedule) => schedule.weekday === weekday && isCurrent(schedule, today))
    .sort((left, right) => left.startLocalTime.localeCompare(right.startLocalTime))

export const pastShifts = (schedules: WorkingSchedule[], today: string) =>
  schedules.filter((schedule) => !isCurrent(schedule, today))

// A short note when a shift is not simply "always": it starts later or has an end.
export const shiftNote = (schedule: WorkingSchedule, today: string) => {
  if (!schedule.active) return 'Inactivo'
  if (schedule.validFrom > today) return `Desde el ${shortBusinessDate(schedule.validFrom)}`
  if (schedule.validTo) return `Hasta el ${shortBusinessDate(schedule.validTo)}`
  return undefined
}

const localTime = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso))

const lastDate = (exception: Pick<AvailabilityException, 'endsAt'>) =>
  businessDateFromIso(new Date(new Date(exception.endsAt).getTime() - 1).toISOString())

// An absence covering the whole opening day, from opening to closing (or longer).
export const isWholeDay = (exception: Pick<AvailabilityException, 'startsAt' | 'endsAt'>) =>
  localTime(exception.startsAt) <= '08:00' && localTime(exception.endsAt) >= '21:00'

// When an exception applies, in words: "lun 6 oct, todo el día",
// "del lun 6 oct al vie 10 oct, todo el día" or "mar 7 oct, 15:00 a 18:00".
export const exceptionWhen = (exception: Pick<AvailabilityException, 'startsAt' | 'endsAt'>) => {
  const first = businessDateFromIso(exception.startsAt)
  const last = lastDate(exception)
  const start = localTime(exception.startsAt)
  const end = localTime(exception.endsAt)
  if (isWholeDay(exception))
    return first === last
      ? `${shortBusinessDate(first)}, todo el día`
      : `Del ${shortBusinessDate(first)} al ${shortBusinessDate(last)}, todo el día`
  return first === last
    ? `${shortBusinessDate(first)}, ${timeRangeText(start, end)}`
    : `Del ${shortBusinessDate(first)}, ${start}, al ${shortBusinessDate(last)}, ${end}`
}

export const isUpcomingException = (exception: AvailabilityException, today: string) =>
  exception.active && lastDate(exception) >= today

// A whole-day absence from the first to the last date: opening of the first day to
// closing of the last, in shop time.
export const wholeDayRange = (firstDate: string, lastDateValue: string) => ({
  startsAt: businessLocalToIso(`${firstDate}T08:00`),
  endsAt: businessLocalToIso(`${lastDateValue}T21:00`),
})

export const timedRange = (date: string, start: string, end: string) => ({
  startsAt: businessLocalToIso(`${date}T${start}`),
  endsAt: businessLocalToIso(`${date}T${end}`),
})

// A shift must fit entirely in one opening window.
export const fitsOpeningWindow = (start: string, end: string) =>
  start < end && shiftPresets.some((window) => start >= window.start && end <= window.end)
