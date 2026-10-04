import {
  formatMinutes,
  middayClosure,
  minutesOfDay,
  timelineEndMinutes,
  timelineStartMinutes,
} from '../agenda/AgendaTimeline'

// The shop opens every day in two shifts (RN-AGEN-11): morning until the midday closure
// and afternoon until closing. The backend stays the authority on what can be booked.
export const openingShifts = [
  { from: timelineStartMinutes, to: middayClosure.startMinutes },
  { from: middayClosure.endMinutes, to: timelineEndMinutes },
] as const

export type OpeningStatus =
  { open: true; until: string } | { open: false; opensAt: string; tomorrow: boolean }

// "Abierto ahora, hasta las 13:00" or "Cerrado, abrimos a las 15:00", in shop time.
export const openingStatus = (now: Date): OpeningStatus => {
  const minutes = minutesOfDay(now.toISOString())
  const current = openingShifts.find((shift) => minutes >= shift.from && minutes < shift.to)
  if (current) return { open: true, until: formatMinutes(current.to) }
  const next = openingShifts.find((shift) => minutes < shift.from)
  return next
    ? { open: false, opensAt: formatMinutes(next.from), tomorrow: false }
    : { open: false, opensAt: formatMinutes(openingShifts[0].from), tomorrow: true }
}

export const openingStatusText = (status: OpeningStatus) =>
  status.open
    ? `Abierto ahora, hasta las ${status.until}`
    : `Cerrado, abrimos ${status.tomorrow ? 'mañana ' : ''}a las ${status.opensAt}`

// "08:00 a 13:00 y 15:00 a 21:00", written with words (plan section 5.2.1).
export const openingHoursText = () =>
  openingShifts
    .map((shift) => `${formatMinutes(shift.from)} a ${formatMinutes(shift.to)}`)
    .join(' y ')
