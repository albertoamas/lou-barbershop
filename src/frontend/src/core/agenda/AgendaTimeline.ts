import { agendaTime, type Appointment, type AppointmentStatus } from './Agenda'

// The shop opens every day 08:00 to 13:00 and 15:00 to 21:00 (RN-AGEN-11). The agenda
// timeline draws that span; the backend remains the authority on what can be booked.
export const timelineStartMinutes = 8 * 60
export const timelineEndMinutes = 21 * 60
export const middayClosure = { startMinutes: 13 * 60, endMinutes: 15 * 60 } as const

export const minutesOfDay = (iso: string) => {
  const [hours = 0, minutes = 0] = agendaTime(iso).split(':').map(Number)
  return hours * 60 + minutes
}

export const formatMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

// Position of an appointment inside the timeline, in minutes from the timeline start,
// clamped so a block never draws outside the visible day.
export const timelineSlot = (appointment: Appointment) => {
  const start = Math.max(minutesOfDay(appointment.startsAt), timelineStartMinutes)
  const end = Math.min(minutesOfDay(appointment.endsAt), timelineEndMinutes)
  return { offset: start - timelineStartMinutes, length: Math.max(end - start, 15) }
}

export const timelineHours = () =>
  Array.from(
    { length: (timelineEndMinutes - timelineStartMinutes) / 60 },
    (_, index) => timelineStartMinutes + index * 60,
  )

// Minutes from the timeline start for "now", or undefined outside the visible day.
export const nowOffset = (now: Date) => {
  const minutes = minutesOfDay(now.toISOString())
  return minutes < timelineStartMinutes || minutes > timelineEndMinutes
    ? undefined
    : minutes - timelineStartMinutes
}

// Time ranges are written with words, never with dashes (plan section 5.2.1).
export const timeRangeLabel = (appointment: Pick<Appointment, 'startsAt' | 'endsAt'>) =>
  `${agendaTime(appointment.startsAt)} a ${agendaTime(appointment.endsAt)}`

const inactive: AppointmentStatus[] = ['CANCELLED', 'NO_SHOW']

export const isActiveAppointment = (appointment: Appointment) =>
  !inactive.includes(appointment.status)

export interface AgendaDaySummary {
  active: number
  waiting: number
  inService: number
}

export const summarizeDay = (appointments: Appointment[]): AgendaDaySummary => ({
  active: appointments.filter(isActiveAppointment).length,
  waiting: appointments.filter((item) => item.status === 'CHECKED_IN').length,
  inService: appointments.filter((item) => item.status === 'IN_SERVICE').length,
})

// Grid rows every 30 minutes, the slot size the shop books in, from opening to closing.
export const halfHourSlots = () =>
  Array.from(
    { length: (timelineEndMinutes - timelineStartMinutes) / 30 },
    (_, index) => timelineStartMinutes + index * 30,
  )

export const isMiddayClosure = (minutes: number) =>
  minutes >= middayClosure.startMinutes && minutes < middayClosure.endMinutes

export interface TimelineLane {
  lane: number
  lanes: number
}

// Places appointments that share time side by side, as calendar apps do: each one gets
// the first free lane, and every appointment in a cluster of overlaps divides the width
// by the cluster's lane count.
export const timelineLanes = (appointments: Appointment[]) => {
  const ordered = [...appointments].sort(
    (left, right) =>
      left.startsAt.localeCompare(right.startsAt) || right.endsAt.localeCompare(left.endsAt),
  )
  const result = new Map<string, TimelineLane>()
  let cluster: string[] = []
  let laneEnds: string[] = []
  let clusterEnd = ''
  const closeCluster = () => {
    for (const id of cluster)
      result.set(id, { lane: result.get(id)?.lane ?? 0, lanes: laneEnds.length })
    cluster = []
    laneEnds = []
    clusterEnd = ''
  }
  for (const appointment of ordered) {
    if (cluster.length > 0 && appointment.startsAt >= clusterEnd) closeCluster()
    let lane = laneEnds.findIndex((end) => end <= appointment.startsAt)
    if (lane === -1) lane = laneEnds.push(appointment.endsAt) - 1
    else laneEnds[lane] = appointment.endsAt
    result.set(appointment.id, { lane, lanes: 0 })
    cluster.push(appointment.id)
    if (appointment.endsAt > clusterEnd) clusterEnd = appointment.endsAt
  }
  closeCluster()
  return result
}
