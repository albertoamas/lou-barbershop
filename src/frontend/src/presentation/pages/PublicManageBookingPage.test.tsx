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
    availabilityRange: vi.fn().mockResolvedValue([]),
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

const renderPage = (entry = '/mi-cita') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[entry]}>
        <PublicManageBookingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const token = 'a'.repeat(43)

describe('public appointment management', () => {
  it('offers a short access form when navigation has no private token', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Mi cita' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Abrir mi cita' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Pega el enlace completo')
    expect(screen.getByRole('link', { name: 'Reservar una cita' })).toHaveAttribute(
      'href',
      '/reservar',
    )
    expect(publicBookingApi.read).not.toHaveBeenCalled()
  })

  it('opens a saved link and leads with the day and time', async () => {
    vi.mocked(publicBookingApi.read).mockResolvedValueOnce(appointment)
    const user = userEvent.setup()
    renderPage()

    await user.type(
      screen.getByLabelText('Tu enlace privado'),
      `http://localhost:8088/mi-cita#${token}`,
    )
    await user.click(screen.getByRole('button', { name: 'Abrir mi cita' }))

    expect(
      await screen.findByRole('heading', { name: /miércoles, 23 de septiembre/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('16:00 a 16:30')).toBeInTheDocument()
    expect(screen.getByText(/Corte con Luis, Bs\s*50,00/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Guardar en mi calendario' })).toHaveAttribute(
      'download',
      'cita-lou-barbershop.ics',
    )
    expect(publicBookingApi.read).toHaveBeenCalledWith(token)
  })

  it('keeps cancelling discreet and asks before doing it', async () => {
    vi.mocked(publicBookingApi.read).mockResolvedValueOnce(appointment)
    vi.mocked(publicBookingApi.cancel).mockResolvedValueOnce({
      ...appointment,
      status: 'CANCELLED',
    })
    const user = userEvent.setup()
    renderPage(`/mi-cita#${token}`)

    await user.click(await screen.findByRole('button', { name: 'Cancelar cita' }))
    expect(publicBookingApi.cancel).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Sí, cancelar cita' }))

    expect(
      await screen.findByText('Esta cita está cancelada y ese horario quedó libre.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reservar otra cita' })).toBeInTheDocument()
  })

  it('reschedules with the booking calendar and loads times without a search button', async () => {
    vi.mocked(publicBookingApi.read).mockResolvedValueOnce(appointment)
    const user = userEvent.setup()
    renderPage(`/mi-cita#${token}`)

    await user.click(await screen.findByRole('button', { name: 'Cambiar día u hora' }))

    expect(await screen.findByRole('group', { name: /^Días de / })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Buscar' })).not.toBeInTheDocument()
    expect(publicBookingApi.availabilityRange).toHaveBeenCalledWith(
      'service',
      'barber',
      expect.any(String),
      expect.any(String),
    )
    expect(screen.getByRole('button', { name: 'Confirmar cambio' })).toBeDisabled()
  })
})
