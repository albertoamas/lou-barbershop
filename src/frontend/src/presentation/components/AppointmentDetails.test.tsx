import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Appointment } from '../../core/agenda/Agenda'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { AppointmentDetails } from './AppointmentDetails'
import { salesApi } from '../../infrastructure/http/salesApi'

vi.mock('../../infrastructure/http/agendaApi', () => ({
  agendaApi: { history: vi.fn().mockResolvedValue([]), transition: vi.fn().mockResolvedValue({}) },
}))
vi.mock('../../infrastructure/http/salesApi', () => ({
  salesApi: { openAppointment: vi.fn() },
}))
const appointment: Appointment = {
  id: 'a',
  customerId: 'c',
  customerName: 'Cliente prueba',
  barberId: 'b',
  barberName: 'Barbero',
  serviceId: 's',
  serviceName: 'Corte',
  startsAt: '2026-09-04T13:00:00Z',
  endsAt: '2026-09-04T14:00:00Z',
  status: 'CONFIRMED',
  quotedPriceCents: null,
  quotedDurationMinutes: 60,
  version: 1,
}
const show = (canManage: boolean, disabled = false) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AppointmentDetails
        appointment={appointment}
        canManage={canManage}
        disabled={disabled}
        onChanged={vi.fn()}
        onReschedule={vi.fn()}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  )
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
describe('appointment actions', () => {
  it('does not show cancellation, customer notes or history to barber', () => {
    show(false)
    expect(screen.getByRole('button', { name: 'Registrar llegada' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument()
    expect(agendaApi.history).not.toHaveBeenCalled()
  })
  it('blocks offline writes', () => {
    show(true, true)
    expect(screen.getByRole('button', { name: 'Cancelar cita' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Registrar llegada' })).toBeDisabled()
  })
  it('requires a reason before cancellation and sends the current version', async () => {
    const user = userEvent.setup()
    show(true)
    await user.click(screen.getByRole('button', { name: 'Cancelar cita' }))
    expect(screen.getByRole('button', { name: 'Confirmar acción' })).toBeDisabled()
    await user.type(screen.getByLabelText('Motivo'), 'Solicitado por cliente')
    await user.click(screen.getByRole('button', { name: 'Confirmar acción' }))
    expect(agendaApi.transition).toHaveBeenCalledWith(
      appointment,
      'cancel',
      'Solicitado por cliente',
    )
  })
  it('hands the opened operation to the canonical route navigator', async () => {
    const user = userEvent.setup()
    const opened = { id: 'operation-1' }
    const onOperationOpened = vi.fn()
    vi.mocked(salesApi.openAppointment).mockResolvedValueOnce(opened as never)
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <AppointmentDetails
          appointment={{ ...appointment, status: 'IN_SERVICE' }}
          canManage
          disabled={false}
          onChanged={vi.fn()}
          onReschedule={vi.fn()}
          onClose={vi.fn()}
          onOperationOpened={onOperationOpened}
        />
      </QueryClientProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir atención y cobro' }))
    expect(salesApi.openAppointment).toHaveBeenCalledWith(appointment.id)
    expect(onOperationOpened).toHaveBeenCalledWith(opened)
  })
})
