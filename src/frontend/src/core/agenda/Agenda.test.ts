import { describe, expect, it } from 'vitest'
import {
  agendaActions,
  agendaTime,
  appointmentsForDate,
  overlapsAnotherAppointment,
  statusLabels,
  type Appointment,
} from './Agenda'

const appointment = (
  id: string,
  startsAt: string,
  endsAt: string,
  barberId = 'barber-1',
): Appointment => ({
  id,
  customerId: `customer-${id}`,
  customerName: `Cliente ${id}`,
  barberId,
  barberName: 'Diego',
  serviceId: 'cut',
  serviceName: 'Corte',
  startsAt,
  endsAt,
  status: 'CONFIRMED',
  quotedPriceCents: 5000,
  quotedDurationMinutes: 30,
  version: 1,
})

describe('agenda view rules', () => {
  it('offers arrival but never cancellation to a barber', () => {
    expect(agendaActions('CONFIRMED', false)).toEqual(['check-in'])
  })

  it('does not offer changes after service starts', () => {
    expect(agendaActions('IN_SERVICE', true)).toEqual([])
  })

  it('offers cancellation after arrival only to management', () => {
    expect(agendaActions('CHECKED_IN', true)).toEqual(['start', 'cancel'])
  })

  it('keeps cancelled and no-show states explicit without relying on color', () => {
    expect(statusLabels.CANCELLED).toBe('Cancelada')
    expect(statusLabels.NO_SHOW).toBe('No asistió')
  })

  it('formats time using Bolivia regardless of the device zone', () => {
    expect(agendaTime('2026-09-04T13:00:00Z')).toBe('09:00')
  })

  it('filters in business time and orders appointments chronologically', () => {
    const later = appointment('later', '2026-09-15T15:00:00-04:00', '2026-09-15T15:30:00-04:00')
    const earlier = appointment('earlier', '2026-09-15T08:00:00-04:00', '2026-09-15T08:30:00-04:00')
    const anotherDay = appointment(
      'other',
      '2026-09-16T08:00:00-04:00',
      '2026-09-16T08:30:00-04:00',
    )

    expect(
      appointmentsForDate([later, anotherDay, earlier], '2026-09-15').map(({ id }) => id),
    ).toEqual(['earlier', 'later'])
  })

  it('flags only active appointments that overlap for the same barber', () => {
    const first = appointment('first', '2026-09-15T08:00:00-04:00', '2026-09-15T08:30:00-04:00')
    const overlap = appointment('overlap', '2026-09-15T08:15:00-04:00', '2026-09-15T08:45:00-04:00')
    const otherBarber = appointment(
      'other',
      '2026-09-15T08:15:00-04:00',
      '2026-09-15T08:45:00-04:00',
      'barber-2',
    )

    expect(overlapsAnotherAppointment(first, [first, overlap])).toBe(true)
    expect(overlapsAnotherAppointment(first, [first, otherBarber])).toBe(false)
    expect(
      overlapsAnotherAppointment({ ...overlap, status: 'CANCELLED' }, [
        first,
        { ...overlap, status: 'CANCELLED' },
      ]),
    ).toBe(false)
  })
})
