import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { LandingPage } from './LandingPage'

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
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
    barbers: [{ id: 'barber-1', displayName: 'Diego Rojas' }],
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('LandingPage', () => {
  it('opens with who Lou is, whether it is open and how to book', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Lou Barbershop', level: 1 })).toBeInTheDocument()
    expect(screen.getAllByText(/^(Abierto ahora, hasta|Cerrado, abrimos)/)[0]).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reservar cita' })).toHaveAttribute('href', '/reservar')
    expect(screen.getByRole('link', { name: 'Ya tengo cita' })).toHaveAttribute('href', '/mi-cita')
  })

  it('books a service or a barber straight from the catalog', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Corte clásico' })).toBeInTheDocument()
    expect(screen.getAllByText(/Bs\s*70,00/)[0]).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reservar Corte clásico' })).toHaveAttribute(
      'href',
      '/reservar?servicio=service-1',
    )
    expect(screen.getByRole('link', { name: 'Reservar con Diego' })).toHaveAttribute(
      'href',
      '/reservar?barbero=barber-1',
    )
  })

  it('shows hours and loads the map only when asked for', async () => {
    renderPage()

    expect(
      screen.getByText('Todos los días, de 08:00 a 13:00 y 15:00 a 21:00.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Cómo llegar' })).toHaveAttribute(
      'href',
      'https://maps.app.goo.gl/WCoCT4uU7mwGRCxA8',
    )
    expect(screen.queryByTitle('Mapa de la ubicación de Lou Barbershop')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Ver mapa' }))

    expect(screen.getByTitle('Mapa de la ubicación de Lou Barbershop')).toHaveAttribute(
      'src',
      expect.stringContaining('-21.5355119,-64.7304746'),
    )
  })
})
