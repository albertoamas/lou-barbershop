import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AppointmentEditor } from './AppointmentEditor'

vi.mock('../../infrastructure/http/agendaApi', () => ({
  agendaApi: { customers: vi.fn(), create: vi.fn(), saveCustomer: vi.fn() },
}))
vi.mock('../../infrastructure/http/schedulingApi', () => ({
  schedulingApi: { listBarbers: vi.fn(), listServices: vi.fn(), search: vi.fn() },
}))

const renderEditor = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AppointmentEditor
        appointment={undefined}
        date="2026-10-05"
        disabled={false}
        onSaved={vi.fn()}
        onClose={vi.fn()}
      />
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(agendaApi.customers).mockResolvedValue([
    { id: 'carlos', displayName: 'Carlos Rojas', phone: '+59171234567', notes: null, version: 1 },
  ])
  vi.mocked(schedulingApi.listBarbers).mockResolvedValue([{ id: 'diego', displayName: 'Diego' }])
  vi.mocked(schedulingApi.listServices).mockResolvedValue([
    {
      id: 'corte',
      name: 'Corte clásico',
      defaultDurationMinutes: 45,
      defaultPriceCents: 6000,
      active: true,
    },
  ])
  vi.mocked(schedulingApi.search).mockResolvedValue([
    {
      barberId: 'diego',
      barberName: 'Diego',
      serviceId: 'corte',
      startsAt: '2026-10-05T19:00:00Z',
      endsAt: '2026-10-05T19:45:00Z',
      durationMinutes: 45,
      priceCents: 6000,
    },
  ])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('AppointmentEditor', () => {
  it('loads free times as soon as a service is chosen and confirms the booking', async () => {
    const user = userEvent.setup()
    vi.mocked(agendaApi.create).mockResolvedValue({} as never)
    renderEditor()

    await user.click(await screen.findByRole('button', { name: /Carlos Rojas/ }))
    await user.selectOptions(await screen.findByLabelText('Servicio'), 'corte')

    await waitFor(() =>
      expect(schedulingApi.search).toHaveBeenCalledWith({
        serviceId: 'corte',
        barberId: 'any',
        dateFrom: '2026-10-05',
        dateTo: '2026-10-05',
      }),
    )
    await user.click(await screen.findByRole('button', { name: /15:00/ }))
    expect(screen.getByText('15:00 a 15:45 con Diego')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirmar cita' }))
    expect(agendaApi.create).toHaveBeenCalledWith({
      barberId: 'diego',
      serviceId: 'corte',
      startsAt: '2026-10-05T19:00:00Z',
      customerId: 'carlos',
    })
  })

  it('does not look for times until a service is chosen', async () => {
    renderEditor()

    expect(
      await screen.findByText('Elige un servicio para ver los horarios libres.'),
    ).toBeInTheDocument()
    expect(schedulingApi.search).not.toHaveBeenCalled()
  })
})
