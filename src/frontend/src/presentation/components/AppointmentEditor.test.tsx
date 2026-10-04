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

const renderEditor = (suggestion: { barberId?: string; startTime?: string } = {}) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AppointmentEditor
        appointment={undefined}
        date="2026-10-05"
        barberId={suggestion.barberId}
        startTime={suggestion.startTime}
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

  it('preselects the barber and the time tapped in the agenda when it is free', async () => {
    const user = userEvent.setup()
    renderEditor({ barberId: 'diego', startTime: '15:00' })
    await screen.findByRole('option', { name: /Corte clásico/ })
    expect(
      screen.getByText('Elegiste las 15:00. Elige el servicio para ver si ese horario está libre.'),
    ).toBeInTheDocument()

    await user.selectOptions(await screen.findByLabelText('Servicio'), 'corte')

    await waitFor(() =>
      expect(schedulingApi.search).toHaveBeenCalledWith(
        expect.objectContaining({ barberId: 'diego', dateFrom: '2026-10-05' }),
      ),
    )
    expect(await screen.findByRole('button', { name: /15:00/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('says when the tapped time is not free for the chosen service', async () => {
    const user = userEvent.setup()
    renderEditor({ barberId: 'diego', startTime: '16:30' })
    await screen.findByRole('option', { name: /Corte clásico/ })

    await user.selectOptions(await screen.findByLabelText('Servicio'), 'corte')

    expect(
      await screen.findByText('Las 16:30 no están libres para este servicio. Elige otro horario.'),
    ).toBeInTheDocument()
  })
})
