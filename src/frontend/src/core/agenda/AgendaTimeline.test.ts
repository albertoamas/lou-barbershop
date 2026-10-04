import { describe, expect, it } from 'vitest'
import type { Appointment } from './Agenda'
import {
  formatMinutes,
  minutesOfDay,
  nowOffset,
  summarizeDay,
  timeRangeLabel,
  timelineHours,
  timelineSlot,
} from './AgendaTimeline'

// La Paz is UTC-4 all year: 19:00Z is 15:00 local.
const appointment = (
  startsAt: string,
  endsAt: string,
  status: Appointment['status'] = 'CONFIRMED',
): Appointment => ({
  id: startsAt,
  customerId: 'c',
  customerName: 'Carlos Rojas',
  barberId: 'b',
  barberName: 'Diego',
  serviceId: 's',
  serviceName: 'Corte clásico',
  startsAt,
  endsAt,
  status,
  quotedPriceCents: 6000,
  quotedDurationMinutes: 45,
  version: 1,
})

describe('agenda timeline', () => {
  it('reads minutes of the day in business time', () => {
    expect(minutesOfDay('2026-10-05T19:30:00Z')).toBe(15 * 60 + 30)
  })

  it('places an appointment by its start and duration', () => {
    expect(timelineSlot(appointment('2026-10-05T19:00:00Z', '2026-10-05T19:45:00Z'))).toEqual({
      offset: 7 * 60,
      length: 45,
    })
  })

  it('clamps blocks that start before the visible day', () => {
    expect(timelineSlot(appointment('2026-10-05T11:30:00Z', '2026-10-05T12:30:00Z'))).toEqual({
      offset: 0,
      length: 30,
    })
  })

  it('lists one mark per hour from opening to the last hour', () => {
    const hours = timelineHours().map(formatMinutes)
    expect(hours[0]).toBe('08:00')
    expect(hours.at(-1)).toBe('20:00')
    expect(hours).toHaveLength(13)
  })

  it('locates now only during the visible day', () => {
    expect(nowOffset(new Date('2026-10-05T20:20:00Z'))).toBe(8 * 60 + 20)
    expect(nowOffset(new Date('2026-10-05T10:00:00Z'))).toBeUndefined()
  })

  it('writes ranges with words instead of dashes', () => {
    expect(timeRangeLabel(appointment('2026-10-05T19:00:00Z', '2026-10-05T19:45:00Z'))).toBe(
      '15:00 a 15:45',
    )
  })

  it('summarizes active, waiting and in-service appointments', () => {
    expect(
      summarizeDay([
        appointment('2026-10-05T19:00:00Z', '2026-10-05T19:45:00Z', 'CHECKED_IN'),
        appointment('2026-10-05T20:00:00Z', '2026-10-05T20:45:00Z', 'IN_SERVICE'),
        appointment('2026-10-05T21:00:00Z', '2026-10-05T21:45:00Z', 'NO_SHOW'),
        appointment('2026-10-05T22:00:00Z', '2026-10-05T22:45:00Z'),
      ]),
    ).toEqual({ active: 3, waiting: 1, inService: 1 })
  })
})
