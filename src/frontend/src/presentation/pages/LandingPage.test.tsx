import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { LandingPage } from './LandingPage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('LandingPage', () => {
  it('presents the public actions and active catalog', async () => {
    vi.spyOn(publicBookingApi, 'catalog').mockResolvedValue({
      services: [
        {
          id: 'service-1',
          name: 'Corte clásico',
          description: 'Corte y acabado',
          durationMinutes: 45,
          priceCents: 7000,
        },
      ],
      barbers: [],
    })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LandingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Tu estilo empieza en Lou.' })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Reservar/ })[0]).toHaveAttribute(
      'href',
      '/reservar',
    )
    expect(screen.getByRole('link', { name: 'Gestionar mi cita' })).toHaveAttribute(
      'href',
      '/mi-cita',
    )
    expect(await screen.findByText('Corte clásico')).toBeInTheDocument()
    expect(screen.getByText('Bs 70,00')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tres pasos. Sin vueltas.' })).toBeInTheDocument()
    expect(screen.getByText('Reserva', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Llega', { selector: 'strong' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Lo necesario. Nada escondido.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Precio visible')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Tu próximo corte empieza aquí.' }),
    ).toBeInTheDocument()
  })
})
