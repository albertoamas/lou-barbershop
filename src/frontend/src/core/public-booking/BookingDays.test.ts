import { describe, expect, it } from 'vitest'
import type { AvailabilitySlot } from '../scheduling/Scheduling'
import {
  appointmentCountdown,
  calendarEvent,
  datesWithSlots,
  daySlots,
  monthOf,
  monthRange,
  monthWeeks,
  shiftMonth,
} from './PublicBooking'

const slot = (startsAt: string, barberName = 'Luis'): AvailabilitySlot => ({
  barberId: barberName,
  barberName,
  serviceId: 'service',
  startsAt,
  endsAt: startsAt,
  durationMinutes: 30,
  priceCents: 5000,
})

describe('booking calendar', () => {
  it('lays out a month in weeks starting on Monday', () => {
    // October 2026 starts on a Thursday and has 31 days.
    const weeks = monthWeeks('2026-10')
    expect(weeks[0]).toEqual([
      undefined,
      undefined,
      undefined,
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(weeks.at(-1)?.filter(Boolean).at(-1)).toBe('2026-10-31')
    expect(weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('moves between months and knows their first and last day', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(monthRange('2026-02')).toEqual({ first: '2026-02-01', last: '2026-02-28' })
    expect(monthOf('2026-10-04')).toBe('2026-10')
  })

  it('knows which business days have free times', () => {
    // 02:00Z on the 6th is still the 5th in La Paz (UTC-4).
    const dates = datesWithSlots([slot('2026-10-05T13:00:00Z'), slot('2026-10-06T02:00:00Z')])
    expect([...dates]).toEqual(['2026-10-05'])
  })

  it('splits one day into morning and afternoon, one slot per time', () => {
    const { morning, afternoon } = daySlots(
      [
        slot('2026-10-05T20:00:00Z', 'Mateo'),
        slot('2026-10-05T12:00:00Z', 'Luis'),
        slot('2026-10-05T12:00:00Z', 'Diego'),
        slot('2026-10-06T12:00:00Z'),
      ],
      '2026-10-05',
    )
    expect(morning.map((item) => item.barberName)).toEqual(['Luis'])
    expect(afternoon.map((item) => item.startsAt)).toEqual(['2026-10-05T20:00:00Z'])
  })
})

describe('calendar event', () => {
  it('writes a valid event with the appointment time in UTC', () => {
    const file = calendarEvent({
      id: 'appointment-1',
      title: 'Corte clásico en Lou Barbershop',
      startsAt: '2026-10-06T12:00:00Z',
      durationMinutes: 45,
      location: 'Lou Barbershop, Tarija',
      description: 'Con Diego',
    })
    expect(file).toContain('DTSTART:20261006T120000Z')
    expect(file).toContain('DTEND:20261006T124500Z')
    expect(file).toContain('LOCATION:Lou Barbershop\\, Tarija')
    expect(file.startsWith('BEGIN:VCALENDAR')).toBe(true)
  })
})

describe('appointment countdown', () => {
  it('speaks in days until the appointment', () => {
    expect(appointmentCountdown('2026-10-04', '2026-10-04')).toBe('Es hoy')
    expect(appointmentCountdown('2026-10-04', '2026-10-05')).toBe('Es mañana')
    expect(appointmentCountdown('2026-10-04', '2026-11-01')).toBe('Faltan 28 días')
    expect(appointmentCountdown('2026-10-04', '2026-10-01')).toBeUndefined()
  })
})
