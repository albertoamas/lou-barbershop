import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { ServicesPage } from './ServicesPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ServicesPage', () => {
  it('lists every service by group, each one booking it directly', async () => {
    vi.spyOn(publicBookingApi, 'catalog').mockResolvedValue({
      services: [
        {
          id: 'combo',
          name: 'Corte y barba',
          description: null,
          durationMinutes: 75,
          priceCents: 9000,
        },
        {
          id: 'kids',
          name: 'Corte infantil',
          description: null,
          durationMinutes: 30,
          priceCents: 4500,
        },
        { id: 'beard', name: 'Barba', description: null, durationMinutes: 30, priceCents: 3500 },
        { id: 'brows', name: 'Cejas', description: null, durationMinutes: 15, priceCents: 1500 },
      ],
      barbers: [],
    })
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter>
          <ServicesPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(
      screen.getByRole('heading', { name: 'Servicios y precios', level: 1 }),
    ).toBeInTheDocument()
    const cuts = await screen.findByRole('region', { name: 'Cortes' })
    expect(within(cuts).getByRole('link', { name: /^Reservar Corte infantil/ })).toHaveAttribute(
      'href',
      '/reservar?servicio=kids',
    )
    expect(screen.getByRole('region', { name: 'Barba y navaja' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Detalles' })).toBeInTheDocument()
    // The featured combo leads the page instead of repeating inside its group.
    expect(screen.getAllByRole('link', { name: /^Reservar Corte y barba/ })).toHaveLength(1)
    expect(screen.queryByRole('link', { name: 'Ver todos los servicios' })).not.toBeInTheDocument()
  })
})
