import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { monthRange } from '../../core/public-booking/PublicBooking'
import { addCalendarDays, todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { BookingSuccess } from '../components/booking/BookingSuccess'
import { PublicBookingPage } from './PublicBookingPage'

vi.mock('../../infrastructure/http/publicBookingApi', () => ({
  publicBookingApi: {
    catalog: vi.fn(),
    availabilityRange: vi.fn(),
    create: vi.fn(),
  },
}))
vi.mock('../hooks/useConnectivity', () => ({ useConnectivity: () => 'offline' }))

// Free times on a business date: 12:00Z is 08:00 and 20:00Z is 16:00 in La Paz.
const slot = (date: string, utcTime: string, barberName = 'Luis') => ({
  barberId: barberName.toLowerCase(),
  barberName,
  serviceId: 'service',
  startsAt: `${date}T${utcTime}:00Z`,
  endsAt: `${date}T${utcTime}:00Z`,
  durationMinutes: 30,
  priceCents: 5_000,
})

const today = todayInBusinessTime()
// A free day inside the visible month: tomorrow, unless today is the last day.
const tomorrow =
  addCalendarDays(today, 1).slice(0, 7) === today.slice(0, 7) ? addCalendarDays(today, 1) : today
const monthEnd = monthRange(today.slice(0, 7)).last

const renderPage = (entry = '/reservar') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[entry]}>
        <PublicBookingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(publicBookingApi.catalog).mockResolvedValue({
    services: [
      { id: 'service', name: 'Corte', description: null, durationMinutes: 30, priceCents: 5_000 },
    ],
    barbers: [{ id: 'luis', displayName: 'Luis' }],
  })
  vi.mocked(publicBookingApi.availabilityRange).mockResolvedValue([
    slot(tomorrow, '12:00'),
    slot(tomorrow, '20:00', 'Mateo'),
  ])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('public booking', () => {
  it('moves on by itself once the service and the barber are tapped', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Reservar' })).toBeVisible()
    expect(screen.getByText(/Paso 1 de 5/)).toBeInTheDocument()
    await user.click(await screen.findByRole('radio', { name: /Corte/ }))
    expect(
      await screen.findByRole('heading', { name: '¿Con quién te atiendes?' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: /Cualquiera/ }))

    expect(await screen.findByRole('heading', { name: 'Elige día y hora' })).toBeInTheDocument()
    // Morning and afternoon show together; with "Cualquiera" each time names the barber.
    expect(await screen.findByRole('radio', { name: '08:00, Luis' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '16:00, Mateo' })).toBeInTheDocument()
    expect(publicBookingApi.availabilityRange).toHaveBeenCalledWith(
      'service',
      'any',
      today,
      monthEnd,
    )
  })

  it('preselects the first free day on a month calendar and greys out the rest', async () => {
    const user = userEvent.setup()
    renderPage('/reservar?servicio=service')
    await user.click(await screen.findByRole('radio', { name: /Cualquiera/ }))

    const calendar = await screen.findByRole('group', { name: /^Días de / })
    const free = within(calendar).getByRole('button', { pressed: true })
    expect(free).toHaveAccessibleName(new RegExp(`${Number(tomorrow.slice(8))} de`))
    expect(within(calendar).getAllByRole('button', { name: /sin horarios$/ })[0]).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: /^Hora para el / })).toBeInTheDocument()
  })

  it('reviews in 24-hour time and blocks confirmation while offline', async () => {
    const user = userEvent.setup()
    renderPage('/reservar?servicio=service&barbero=luis')
    await user.click(await screen.findByRole('radio', { name: /Luis/ }))
    await user.click(await screen.findByRole('radio', { name: '16:00, Mateo' }))
    expect(screen.getByText(/pueden estar desactualizados/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.type(screen.getByLabelText('Nombre'), 'Cliente')
    await user.type(screen.getByLabelText('WhatsApp o teléfono'), '71234567')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(await screen.findByText(/, 16:00$/, { selector: 'dd' })).toBeInTheDocument()
    expect(screen.queryByText(/p\.\s*m\./i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cambiar día y hora' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Conéctate para confirmar' })).toBeDisabled()
    expect(publicBookingApi.create).not.toHaveBeenCalled()
  })

  it('asks for what is missing instead of moving on', async () => {
    const user = userEvent.setup()
    renderPage('/reservar?servicio=service&barbero=luis')
    await user.click(await screen.findByRole('radio', { name: /Luis/ }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Elige una hora libre para continuar.')

    await user.click(await screen.findByRole('radio', { name: '08:00, Luis' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))
    await user.click(screen.getByRole('button', { name: 'Continuar' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Escribe tu nombre.')
  })

  it('starts at the barber step when the home already chose the service', async () => {
    renderPage('/reservar?servicio=service&barbero=luis')

    expect(
      await screen.findByRole('heading', { name: '¿Con quién te atiendes?' }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('radio', { name: /Luis/ })).toBeChecked()
  })

  it('celebrates the booking and offers the private link and a calendar file', () => {
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

    expect(screen.getByRole('heading', { level: 1, name: 'Te esperamos, José.' })).toBeVisible()
    expect(screen.getByText('miércoles, 23 de septiembre, 16:00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Guardar en mi calendario' })).toHaveAttribute(
      'download',
      'cita-lou-barbershop.ics',
    )
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Compartir por WhatsApp' })).toHaveAttribute(
      'href',
      expect.stringContaining('https://wa.me/?text='),
    )
  })
})
