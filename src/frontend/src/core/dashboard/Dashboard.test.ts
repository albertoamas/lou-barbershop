import { describe, expect, it } from 'vitest'
import {
  activeAppointments,
  availableCommissionCents,
  dashboardRoleFor,
  nextAppointment,
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
