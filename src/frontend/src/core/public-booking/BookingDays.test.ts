import { describe, expect, it } from 'vitest'
import type { AvailabilitySlot } from '../scheduling/Scheduling'
import { bookingDays, calendarEvent, datesWithSlots, daySlots } from './PublicBooking'

const slot = (startsAt: string, barberName = 'Luis'): AvailabilitySlot => ({
  barberId: barberName,
  barberName,
  serviceId: 'service',
  startsAt,
  endsAt: startsAt,
  durationMinutes: 30,
  priceCents: 5000,
})

describe('booking days', () => {
  it('lists the next two weeks from today', () => {
    const days = bookingDays('2026-10-04')
    expect(days).toHaveLength(14)
    expect(days[0]).toBe('2026-10-04')
    expect(days.at(-1)).toBe('2026-10-17')
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
