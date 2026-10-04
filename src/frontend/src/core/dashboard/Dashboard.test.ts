import { describe, expect, it } from 'vitest'
import {
  activeAppointments,
  availableCommissionCents,
  dashboardRoleFor,
  dayCounts,
  greetingFor,
  nextAppointment,
  statusSentence,
  upcomingAppointments,
} from './Dashboard'

describe('role dashboard rules', () => {
  it('prioritizes the owner dashboard when the owner also works as a barber', () => {
    expect(dashboardRoleFor(['BARBER', 'OWNER'])).toBe('OWNER')
    expect(dashboardRoleFor(['ADMIN'])).toBe('ADMIN')
    expect(dashboardRoleFor(['BARBER'])).toBe('BARBER')
  })

  it('keeps available commission debt separate from settled and paid entries', () => {
    const base = {
      id: '1',
      barberId: 'barber',
      description: 'Corte',
      type: 'EARNING' as const,
      baseCents: 10_000,
      rateBasisPoints: 4_000,
      amountCents: 4_000,
      earnedAt: '2026-09-13T12:00:00Z',
    }
    expect(
      availableCommissionCents([
        { ...base, status: 'AVAILABLE' },
        { ...base, id: '2', amountCents: -500, status: 'AVAILABLE', type: 'REVERSAL' },
        { ...base, id: '3', status: 'PAID' },
      ]),
    ).toBe(3_500)
  })

  it('selects the next active appointment and ignores cancelled ones', () => {
    const appointments = [
      {
        id: 'cancelled',
        customerName: 'Ana',
        barberName: 'Diego',
        serviceName: 'Corte',
        status: 'CANCELLED',
        startsAt: '2026-09-13T15:00:00Z',
      },
      {
        id: 'later',
        customerName: 'Luis',
        barberName: 'Diego',
        serviceName: 'Barba',
        status: 'CONFIRMED',
        startsAt: '2026-09-13T17:00:00Z',
      },
      {
        id: 'next',
        customerName: 'José',
        barberName: 'Mateo',
        serviceName: 'Corte',
        status: 'CHECKED_IN',
        startsAt: '2026-09-13T16:00:00Z',
      },
    ]
    expect(activeAppointments(appointments)).toHaveLength(2)
    expect(nextAppointment(appointments, new Date('2026-09-13T15:30:00Z'))?.id).toBe('next')
  })
})

const visit = (id: string, status: string, startsAt: string) => ({
  id,
  customerName: id,
  barberName: 'Diego',
  serviceName: 'Corte',
  status,
  startsAt,
})

describe('home summary', () => {
  // La Paz is UTC-4.
  it('greets by the shop hour, not the device zone', () => {
    expect(greetingFor(new Date('2026-10-04T13:00:00Z'))).toBe('Buenos días')
    expect(greetingFor(new Date('2026-10-04T18:00:00Z'))).toBe('Buenas tardes')
    expect(greetingFor(new Date('2026-10-05T01:00:00Z'))).toBe('Buenas noches')
  })

  it('counts who waits, who is served, who comes and what is left to charge', () => {
    const now = new Date('2026-10-04T18:00:00Z')
    const counts = dayCounts(
      [
        visit('a', 'CHECKED_IN', '2026-10-04T17:30:00Z'),
        visit('b', 'IN_SERVICE', '2026-10-04T17:00:00Z'),
        visit('c', 'CONFIRMED', '2026-10-04T19:00:00Z'),
        visit('d', 'CONFIRMED', '2026-10-04T16:00:00Z'),
        visit('e', 'CANCELLED', '2026-10-04T20:00:00Z'),
      ],
      ['DRAFT', 'READY_TO_PAY', 'PAID'],
      now,
    )
    expect(counts).toEqual({ waiting: 1, inService: 1, upcoming: 1, pendingCharges: 2 })
  })

  it('lists the next confirmed arrivals soonest first', () => {
    const now = new Date('2026-10-04T18:00:00Z')
    const list = upcomingAppointments(
      [
        visit('late', 'CONFIRMED', '2026-10-04T21:00:00Z'),
        visit('soon', 'CONFIRMED', '2026-10-04T19:00:00Z'),
        visit('past', 'CONFIRMED', '2026-10-04T17:00:00Z'),
      ],
      now,
      1,
    )
    expect(list.map((item) => item.id)).toEqual(['soon'])
  })

  it('says what is pending in one sentence', () => {
    expect(statusSentence({ waiting: 2, inService: 0, upcoming: 3, pendingCharges: 1 })).toBe(
      '2 clientes esperando, 1 por cobrar.',
    )
    expect(statusSentence({ waiting: 0, inService: 0, upcoming: 0, pendingCharges: 0 })).toBe(
      'Nada pendiente por ahora.',
    )
  })
})
