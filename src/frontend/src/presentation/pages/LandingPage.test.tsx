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
    expect(screen.getByRole('link', { name: 'Reserva tu cita' })).toHaveAttribute(
      'href',
      '/reservar',
    )
    expect(screen.getByRole('link', { name: 'Gestionar mi cita' })).toHaveAttribute(
      'href',
      '/mi-cita',
    )
    expect(await screen.findByText('Corte clásico')).toBeInTheDocument()
    expect(screen.getByText('Bs 70,00')).toBeInTheDocument()
    expect(screen.getByText('SERVICIO 01')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tres pasos. Sin vueltas.' })).toBeInTheDocument()
    expect(screen.getByText('Reserva', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('Llega', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estamos ubicados aquí.' })).toBeInTheDocument()
    expect(screen.getByTitle('Ubicación de Lou Barbershop en Google Maps')).toHaveAttribute(
      'src',
      expect.stringContaining('-21.5355119,-64.7304746'),
    )
    expect(screen.getByRole('link', { name: 'Abrir en Google Maps' })).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/WCoCT4uU7mwGRCxA8',
    )
    expect(
      screen.getByRole('heading', { name: 'Tu próximo corte empieza aquí.' }),
    ).toBeInTheDocument()
  })
})
