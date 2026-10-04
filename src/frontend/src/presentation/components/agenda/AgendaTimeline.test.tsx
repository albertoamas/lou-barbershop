import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Appointment } from '../../../core/agenda/Agenda'
import { AgendaTimeline } from './AgendaTimeline'

afterEach(cleanup)

const appointment = (
  id: string,
  startsAt: string,
  endsAt: string,
  status: Appointment['status'],
): Appointment => ({
  id,
  customerId: id,
  customerName: `Cliente ${id}`,
  barberId: 'diego',
  barberName: 'Diego',
  serviceId: 's',
  serviceName: 'Corte y barba',
  startsAt,
  endsAt,
  status,
  quotedPriceCents: 9000,
  quotedDurationMinutes: 75,
  version: 1,
})

// La Paz is UTC-4: 20:00Z is 16:00 local.
const long = appointment('largo', '2026-10-05T20:00:00Z', '2026-10-05T21:15:00Z', 'CHECKED_IN')
const short = appointment('corto', '2026-10-05T21:30:00Z', '2026-10-05T22:00:00Z', 'CONFIRMED')

describe('AgendaTimeline', () => {
  it('shows each barber as a region with their appointments and states', () => {
    render(
      <AgendaTimeline
        columns={[{ id: 'diego', name: 'Diego', appointments: [long, short] }]}
        allAppointments={[long, short]}
        onOpen={vi.fn()}
      />,
    )

    const column = screen.getByRole('region', { name: 'Agenda de Diego' })
    expect(within(column).getByText('2 citas')).toBeInTheDocument()
    expect(within(column).getByText('16:00 a 17:15')).toBeInTheDocument()
    expect(within(column).getByText('Cliente llegó')).toBeInTheDocument()
    // A short block keeps its state for assistive technology even without the label.
    expect(within(column).getByText('Confirmada')).toHaveClass('sr-only')
    expect(within(column).getByText('Cerrado de 13:00 a 15:00')).toBeInTheDocument()
  })

  it('opens the appointment that was tapped and marks the selected one', async () => {
    const onOpen = vi.fn()
    render(
      <AgendaTimeline
        columns={[{ id: 'diego', name: 'Diego', appointments: [long, short] }]}
        allAppointments={[long, short]}
        selectedId="largo"
        onOpen={onOpen}
      />,
    )

    await userEvent.setup().click(screen.getByRole('button', { name: /Cliente corto/ }))

    expect(onOpen).toHaveBeenCalledWith(short)
    expect(screen.getByRole('button', { name: /Cliente largo/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('shows the current time only when it is given', () => {
    const { rerender } = render(
      <AgendaTimeline
        columns={[{ id: 'diego', name: 'Diego', appointments: [] }]}
        allAppointments={[]}
        onOpen={vi.fn()}
      />,
    )
    expect(screen.queryByText('16:20')).not.toBeInTheDocument()

    rerender(
      <AgendaTimeline
        columns={[{ id: 'diego', name: 'Diego', appointments: [] }]}
        allAppointments={[]}
        now={{ offset: 8 * 60 + 20, label: '16:20' }}
        onOpen={vi.fn()}
      />,
    )
    expect(screen.getByText('16:20')).toBeInTheDocument()
  })
})
