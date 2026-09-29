import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { PublicManageBookingPage } from './PublicManageBookingPage'

vi.mock('../../infrastructure/http/publicBookingApi', () => ({
  publicBookingApi: {
    read: vi.fn(),
    catalog: vi.fn().mockResolvedValue({ services: [], barbers: [] }),
    availability: vi.fn().mockResolvedValue([]),
    reschedule: vi.fn(),
    cancel: vi.fn(),
  },
}))
vi.mock('../hooks/useConnectivity', () => ({ useConnectivity: () => 'online' }))

const appointment = {
  id: 'appointment',
  customerName: 'Cliente Prueba',
  serviceId: 'service',
  serviceName: 'Corte',
  barberId: 'barber',
  barberName: 'Luis',
  startsAt: '2026-09-23T20:00:00Z',
  endsAt: '2026-09-23T20:30:00Z',
  status: 'CONFIRMED' as const,
  priceCents: 5_000,
  durationMinutes: 30,
  version: 1,
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <PublicManageBookingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('public appointment management', () => {
  it('offers a useful access form when navigation has no private token', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Gestiona tu cita.' })).toBeVisible()
    expect(screen.getByLabelText('Enlace privado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir mi cita' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pega el enlace completo')
    expect(publicBookingApi.read).not.toHaveBeenCalled()
  })

  it('opens a saved management link and renders the appointment', async () => {
    vi.mocked(publicBookingApi.read).mockResolvedValueOnce(appointment)
    const user = userEvent.setup()
    const token = 'a'.repeat(43)
    renderPage()

    await user.type(
      screen.getByLabelText('Enlace privado'),
      `http://localhost:8088/mi-cita#${token}`,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir mi cita' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Tu cita, bajo control.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Corte')).toBeInTheDocument()
    expect(publicBookingApi.read).toHaveBeenCalledWith(token)
  })
})
