import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Appointment } from '../../../core/agenda/Agenda'
import { AgendaTimeline, BarberColumnHeader, type AgendaColumn } from './AgendaTimeline'

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

const diego = (appointments: Appointment[], extra: Partial<AgendaColumn> = {}): AgendaColumn[] => [
  {
    id: 'diego',
    label: 'Agenda de Diego',
    header: <BarberColumnHeader name="Diego" count={appointments.length} />,
    appointments,
    isToday: true,
    ...extra,
  },
]

describe('AgendaTimeline', () => {
  it('shows each barber as a region with their appointments and states', () => {
    render(
      <AgendaTimeline
        columns={diego([long, short])}
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
        columns={diego([long, short])}
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
      <AgendaTimeline columns={diego([])} allAppointments={[]} onOpen={vi.fn()} />,
    )
    expect(screen.queryByText('16:20')).not.toBeInTheDocument()

    rerender(
      <AgendaTimeline
        columns={diego([])}
        allAppointments={[]}
        now={{ offset: 8 * 60 + 20, label: '16:20' }}
        onOpen={vi.fn()}
      />,
    )
    expect(screen.getByText('16:20')).toBeInTheDocument()
  })

  it('books an empty half hour from now on, skipping the midday closure', async () => {
    const onSelect = vi.fn()
    render(
      <AgendaTimeline
        columns={diego([], {
          create: {
            fromMinutes: 10 * 60 + 10,
            label: (time) => `Nueva cita a las ${time}`,
            onSelect,
          },
        })}
        allAppointments={[]}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Nueva cita a las 10:00' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nueva cita a las 13:30' })).not.toBeInTheDocument()
    const slot = screen.getByRole('button', { name: 'Nueva cita a las 10:30' })
    // A pointer shortcut: keyboard users book with the page's "Nueva cita" button.
    expect(slot).toHaveAttribute('tabindex', '-1')

    await userEvent.setup().click(slot)
    expect(onSelect).toHaveBeenCalledWith('10:30')
  })

  it('draws overlapping appointments side by side', () => {
    const twin = appointment('doble', '2026-10-05T20:30:00Z', '2026-10-05T21:00:00Z', 'CONFIRMED')
    render(
      <AgendaTimeline
        columns={diego([long, twin])}
        allAppointments={[long, twin]}
        onOpen={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /Cliente largo/ }).style.width).toBe(
      'calc(50% - 5px)',
    )
    expect(screen.getByRole('button', { name: /Cliente doble/ }).style.left).toBe('calc(50% + 3px)')
  })
})
