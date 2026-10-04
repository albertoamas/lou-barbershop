import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { BookingSuccess, PublicBookingPage } from './PublicBookingPage'

vi.mock('../../infrastructure/http/publicBookingApi', () => ({
  publicBookingApi: {
    catalog: vi.fn().mockResolvedValue({
      services: [
        { id: 'service', name: 'Corte', description: null, durationMinutes: 30, priceCents: 5_000 },
      ],
      barbers: [{ id: 'barber', displayName: 'Luis' }],
    }),
    availability: vi.fn().mockResolvedValue([
      {
        barberId: 'barber',
        barberName: 'Luis',
        serviceId: 'service',
        startsAt: '2026-09-20T13:00:00Z',
        endsAt: '2026-09-20T13:30:00Z',
        durationMinutes: 30,
        priceCents: 5_000,
      },
    ]),
    create: vi.fn(),
  },
}))
vi.mock('../hooks/useConnectivity', () => ({ useConnectivity: () => 'offline' }))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('public booking', () => {
  it('keeps the confirmation greeting and customer name in one centered composition', () => {
    render(
      <MemoryRouter>
        <BookingSuccess
          confirmation={{
            appointment: {
              id: 'appointment',
              customerName: 'José',
              serviceId: 'service',
              serviceName: 'Corte',
              barberId: 'barber',
              barberName: 'Luis',
              startsAt: '2026-09-23T20:00:00Z',
              endsAt: '2026-09-23T20:30:00Z',
              status: 'CONFIRMED',
              priceCents: 5_000,
              durationMinutes: 30,
              version: 1,
            },
            managementToken: 'token',
            managementPath: '/mi-cita#token',
          }}
        />
      </MemoryRouter>,
    )

    const heading = screen.getByRole('heading', { level: 1, name: 'Te esperamos, José.' })
    expect(heading).toHaveClass('justify-center', 'lg:flex-nowrap')
    expect(heading.children).toHaveLength(2)
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Compartir por WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text='),
    )
  })

  it('shows a compact header, one date control and every morning slot through 12:30', async () => {
    const morningSlots = Array.from({ length: 10 }, (_, index) => {
      const startsAt = new Date('2026-09-20T12:00:00Z')
      startsAt.setUTCMinutes(index * 30)
      const endsAt = new Date(startsAt)
      endsAt.setUTCMinutes(endsAt.getUTCMinutes() + 30)
      return {
        barberId: 'barber',
        barberName: 'Luis',
        serviceId: 'service',
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        durationMinutes: 30,
        priceCents: 5_000,
      }
    })
    vi.mocked(publicBookingApi.availability).mockResolvedValueOnce(morningSlots)
    const user = userEvent.setup()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <PublicBookingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Tu cita, paso a paso.' })).toBeVisible()
    expect(screen.getByText('Paso 1 de 5')).toBeInTheDocument()
    expect(screen.getByText('Reserva en línea')).toBeVisible()
    expect(
      screen.getByText(
        'Elige sólo lo necesario. Confirmaremos el precio y el horario antes de reservar.',
      ),
    ).toBeVisible()
    await user.click(await screen.findByRole('radio', { name: /Corte/ }))
    await user.click(screen.getByRole('button', { name: /Continuar/ }))
    await user.click(screen.getByRole('button', { name: /Continuar/ }))

    expect(await screen.findByRole('radio', { name: /12:30.*Luis/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Selecciona una fecha')).toHaveAttribute('type', 'date')
    expect(screen.queryByLabelText('Próximos días')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /horarios más/ })).not.toBeInTheDocument()
    expect(screen.getAllByRole('radio', { name: /Luis/ })).toHaveLength(10)
  })

  it('allows cached schedule exploration but blocks confirmation while offline', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <PublicBookingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await user.click(await screen.findByRole('radio', { name: /Corte/ }))
    await user.click(screen.getByRole('button', { name: /Continuar/ }))
    expect(screen.getByRole('radio', { name: /Cualquier barbero/ })).toBeChecked()
    await user.click(screen.getByRole('button', { name: /Continuar/ }))
    await user.click(await screen.findByRole('radio', { name: /09:00.*Luis/ }))
    expect(screen.getByText(/pueden estar desactualizados/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Continuar/ }))
    await user.type(screen.getByLabelText('Nombre'), 'Cliente')
    await user.type(screen.getByLabelText('WhatsApp o teléfono'), '71234567')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: /Continuar/ }))

    expect(await screen.findByRole('button', { name: 'Conéctate para confirmar' })).toBeDisabled()
    expect(publicBookingApi.create).not.toHaveBeenCalled()
  })

  it('shows the selected afternoon time unchanged in the summary using 24-hour format', async () => {
    vi.mocked(publicBookingApi.availability).mockResolvedValueOnce([
      {
        barberId: 'barber',
        barberName: 'Luis',
        serviceId: 'service',
        startsAt: '2026-09-23T20:00:00Z',
        endsAt: '2026-09-23T20:30:00Z',
        durationMinutes: 30,
        priceCents: 5_000,
      },
    ])
    const user = userEvent.setup()

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <PublicBookingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await user.click(await screen.findByRole('radio', { name: /Corte/ }))
    await user.click(screen.getByRole('button', { name: /Continuar/ }))
    await user.click(screen.getByRole('button', { name: /Continuar/ }))
    await user.click(await screen.findByRole('radio', { name: /16:00.*Luis/ }))

    expect(screen.getAllByText(/miércoles, 23 de septiembre, 16:00/)).not.toHaveLength(0)
    expect(screen.queryByText(/04:00 p\.\s*m\./i)).not.toBeInTheDocument()
  })

  it('starts at the barber step when the home already chose the service', async () => {
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={['/reservar?servicio=service&barbero=barber']}>
          <PublicBookingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      await screen.findByRole('heading', { name: '¿Con quién te atiendes?' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: /Luis/ })).toBeChecked()
  })
})
