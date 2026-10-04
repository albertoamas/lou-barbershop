import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
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

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
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
    expect(screen.getByRole('button', { name: /Nueva cita/ })).toBeInTheDocument()
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
    expect(screen.queryByRole('button', { name: /Nueva cita/ })).not.toBeInTheDocument()
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
