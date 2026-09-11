import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { PublicBookingPage } from './PublicBookingPage'

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
})
