import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Appointment } from '../../core/agenda/Agenda'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { MotionProvider } from '../components/MotionProvider'
import { AgendaPage } from './AgendaPage'

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../../infrastructure/http/agendaApi', () => ({
  agendaApi: { list: vi.fn(), history: vi.fn() },
}))
vi.mock('../../infrastructure/http/schedulingApi', () => ({
  schedulingApi: { listBarbers: vi.fn(), listServices: vi.fn(), search: vi.fn() },
}))

const renderPage = (entry = '/app/agenda') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[entry]}>
        <MotionProvider>
          <AgendaPage />
        </MotionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const admin = { id: 'admin', userName: 'admin.demo', roles: ['ADMIN'] }

// 14:00Z is 10:00 in La Paz, inside the visible timeline.
const appointment = (id: string, barberId: string, barberName: string): Appointment => ({
  id,
  customerId: id,
  customerName: `Cliente ${id}`,
  barberId,
  barberName,
  serviceId: 's',
  serviceName: 'Corte y barba',
  startsAt: '2026-09-15T14:00:00Z',
  endsAt: '2026-09-15T15:00:00Z',
  status: 'CONFIRMED',
  quotedPriceCents: 9000,
  quotedDurationMinutes: 60,
  version: 1,
})

// jsdom has no matchMedia; a stub lets a test render the tablet and desktop layouts.
const mockMediaQueries = (matches: boolean) =>
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  )

beforeAll(() => {
  // jsdom implements <dialog> without showModal and close.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
  Element.prototype.scrollIntoView ??= () => undefined
})

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.mocked(agendaApi.history).mockResolvedValue([])
  vi.setSystemTime(new Date('2026-09-15T14:00:00Z'))
  vi.mocked(agendaApi.list).mockResolvedValue([])
  vi.mocked(schedulingApi.listBarbers).mockResolvedValue([
    { id: 'diego', displayName: 'Diego' },
    { id: 'alex', displayName: 'Alex' },
  ])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('AgendaPage', () => {
  it('shows the team controls and creation action to an administrator', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva cita' })).toBeInTheDocument()
    expect(screen.getByLabelText('Barbero')).toBeInTheDocument()
    expect(await screen.findByRole('region', { name: 'Agenda de Diego' })).toBeInTheDocument()
  })

  it('keeps a barber in a personal agenda without team controls', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Mi agenda' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nueva cita' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Barbero')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(agendaApi.list).toHaveBeenCalledWith('2026-09-15', '2026-09-15', undefined),
    )
  })

  it('shows one barber at a time on a phone and switches with the barber chips', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage()

    expect(await screen.findByRole('region', { name: 'Agenda de Diego' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Agenda de Alex' })).not.toBeInTheDocument()

    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole('button', { name: /Alex/ }))

    expect(await screen.findByRole('region', { name: 'Agenda de Alex' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Agenda de Diego' })).not.toBeInTheDocument()
    // Switching the visible barber on a phone does not refetch the whole team.
    expect(agendaApi.list).toHaveBeenLastCalledWith('2026-09-15', '2026-09-15', '')
  })

  it('opens the date and view kept in the link', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage('/app/agenda?fecha=2026-09-10&vista=semana')

    await waitFor(() => expect(agendaApi.list).toHaveBeenCalledWith('2026-09-10', '2026-09-16', ''))
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('marks the today button as the current date only while today is shown', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    renderPage('/app/agenda?fecha=2026-09-12')
    const todayButton = await screen.findByRole('button', { name: 'Hoy' })
    expect(todayButton).not.toHaveAttribute('aria-current')

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(todayButton)

    await waitFor(() => expect(todayButton).toHaveAttribute('aria-current', 'date'))
    expect(screen.getByLabelText('Ir a una fecha')).toHaveValue('2026-09-15')
  })

  it('limits the phone week to the barber chosen in the chips', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(agendaApi.list).mockResolvedValue([
      appointment('a', 'diego', 'Diego'),
      appointment('b', 'alex', 'Alex'),
    ])
    renderPage('/app/agenda?fecha=2026-09-15&vista=semana')

    expect(await screen.findByRole('button', { name: /Cliente a/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cliente b/ })).not.toBeInTheDocument()

    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole('button', { name: 'Alex' }))

    expect(await screen.findByRole('button', { name: /Cliente b/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cliente a/ })).not.toBeInTheDocument()
  })

  it('closes the inline detail with Escape and returns focus to the appointment', async () => {
    mockMediaQueries(true)
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(agendaApi.list).mockResolvedValue([appointment('a', 'diego', 'Diego')])
    renderPage()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    const block = await screen.findByRole('button', { name: /Cliente a/ })
    await user.click(block)
    const panel = await screen.findByRole('complementary', { name: 'Detalle de cita' })
    await waitFor(() => expect(panel).toHaveFocus())

    await user.keyboard('{Escape}')

    await waitFor(() =>
      expect(
        screen.queryByRole('complementary', { name: 'Detalle de cita' }),
      ).not.toBeInTheDocument(),
    )
    expect(block).toHaveFocus()
  })

  it('closes the phone detail sheet when the dialog is cancelled', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(agendaApi.list).mockResolvedValue([appointment('a', 'diego', 'Diego')])
    renderPage()

    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(await screen.findByRole('button', { name: /Cliente a/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Detalle de cita' })

    // Browsers fire "cancel" on a modal dialog when Escape is pressed.
    fireEvent(sheet, new Event('cancel', { cancelable: true }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Detalle de cita' })).not.toBeInTheDocument(),
    )
  })

  it('books an empty half hour with the barber and day already chosen', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(schedulingApi.listServices).mockResolvedValue([])
    renderPage()

    // 14:00Z is 10:00 in La Paz: earlier half hours are gone, later ones can be booked.
    await screen.findByRole('region', { name: 'Agenda de Diego' })
    expect(
      screen.queryByRole('button', { name: /Nueva cita con Diego, .* a las 09:30/ }),
    ).toBeNull()
    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole('button', { name: /Nueva cita con Diego, .* a las 11:00/ }))

    const editor = await screen.findByRole('dialog', { name: 'Nueva cita' })
    expect(within(editor).getByLabelText('Barbero')).toHaveValue('diego')
    expect(within(editor).getByLabelText('Fecha')).toHaveValue('2026-09-15')
  })

  it('moves safely to the previous day', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage()
    await screen.findByRole('heading', { name: 'Agenda' })

    await userEvent
      .setup({ advanceTimers: vi.advanceTimersByTime })
      .click(screen.getByRole('button', { name: 'Día anterior' }))

    await waitFor(() => expect(agendaApi.list).toHaveBeenCalledWith('2026-09-14', '2026-09-14', ''))
  })
})
