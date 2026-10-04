import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { wholeDayRange } from '../../core/scheduling/Availability'
import { addCalendarDays, todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { MemoryRouter } from 'react-router-dom'
import { MotionProvider } from '../components/MotionProvider'
import { SchedulingPage } from './SchedulingPage'

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../../infrastructure/http/salesApi', () => ({ salesApi: { ownBarber: vi.fn() } }))
vi.mock('../../infrastructure/http/schedulingApi', () => ({
  schedulingApi: {
    listBarbers: vi.fn(),
    listServices: vi.fn(),
    search: vi.fn(),
    listSchedules: vi.fn(),
    createSchedule: vi.fn(),
    updateSchedule: vi.fn(),
    listExceptions: vi.fn(),
    createException: vi.fn(),
    deactivateException: vi.fn(),
  },
}))

const today = todayInBusinessTime()
const schedule = {
  id: 'schedule-1',
  barberId: 'barber-1',
  weekday: 1,
  startLocalTime: '08:00',
  endLocalTime: '13:00',
  validFrom: addCalendarDays(today, -30),
  active: true,
  version: 1,
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <MotionProvider>
          <SchedulingPage />
        </MotionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(authApi.current).mockResolvedValue({
    id: 'owner-1',
    userName: 'owner',
    roles: ['OWNER', 'BARBER'],
  })
  vi.mocked(salesApi.ownBarber).mockResolvedValue({ barberId: 'barber-1' })
  vi.mocked(schedulingApi.listBarbers).mockResolvedValue([
    { id: 'barber-1', displayName: 'Lou' },
    { id: 'barber-2', displayName: 'Diego' },
  ])
  vi.mocked(schedulingApi.listServices).mockResolvedValue([])
  vi.mocked(schedulingApi.listSchedules).mockResolvedValue([schedule])
  vi.mocked(schedulingApi.listExceptions).mockResolvedValue([])
  vi.mocked(schedulingApi.search).mockResolvedValue([])
  vi.mocked(schedulingApi.updateSchedule).mockResolvedValue({ schedule, conflicts: [] })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const absence = (() => {
  const range = wholeDayRange(addCalendarDays(today, 2), addCalendarDays(today, 4))
  return {
    id: 'exception-1',
    barberId: 'barber-1',
    ...range,
    kind: 'UNAVAILABLE' as const,
    reason: 'Vacaciones',
    active: true,
    version: 1,
  }
})()

describe('SchedulingPage', () => {
  it('shows the weekly shifts per day and edits one with a preset', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Disponibilidad' })).toBeVisible()
    expect(await screen.findByRole('button', { name: /Diego/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(await screen.findByRole('button', { name: 'Editar turno 08:00 a 13:00' })).toBeVisible()
    expect(screen.getAllByText('Libre')).toHaveLength(6)

    await user.click(screen.getByRole('button', { name: 'Editar turno 08:00 a 13:00' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editar turno' })
    expect(within(dialog).getByRole('radio', { name: /Mañana/ })).toHaveAttribute(
      'aria-checked',
      'true',
    )
    await user.click(within(dialog).getByRole('radio', { name: /Tarde/ }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() =>
      expect(schedulingApi.updateSchedule).toHaveBeenCalledWith(
        schedule,
        expect.objectContaining({ weekday: 1, startLocalTime: '15:00', endLocalTime: '21:00' }),
      ),
    )
  })

  it('keeps a barber on a read-only view of the own schedule', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber',
      userName: 'diego',
      roles: ['BARBER'],
    })
    renderPage()

    expect(await screen.findByRole('heading', { level: 1, name: 'Mi horario' })).toBeVisible()
    expect(await screen.findByText('08:00 a 13:00')).toBeVisible()
    expect(screen.queryByRole('group', { name: 'Barbero' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agregar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Registrar ausencia/ })).not.toBeInTheDocument()
  })

  it('lists an upcoming absence in words and registers a whole-day one with a reason chip', async () => {
    vi.mocked(schedulingApi.listExceptions).mockResolvedValue([absence])
    vi.mocked(schedulingApi.createException).mockResolvedValue({
      exception: absence,
      conflicts: [],
    })
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByText(/^Del .*, todo el día$/)).toBeVisible()
    expect(screen.getByRole('button', { name: /^Quitar ausencia/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Registrar ausencia/ }))
    const dialog = await screen.findByRole('dialog', { name: /Registrar ausencia/ })
    expect(within(dialog).getByRole('checkbox', { name: 'Todo el día' })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Vacaciones' }))
    await user.click(within(dialog).getByRole('button', { name: 'Guardar ausencia' }))

    await waitFor(() =>
      expect(schedulingApi.createException).toHaveBeenCalledWith('barber-1', {
        startsAt: `${today}T08:00:00-04:00`,
        endsAt: `${today}T21:00:00-04:00`,
        kind: 'UNAVAILABLE',
        reason: 'Vacaciones',
      }),
    )
  })

  it('points to the agenda when a change leaves appointments outside the hours', async () => {
    vi.mocked(schedulingApi.updateSchedule).mockResolvedValue({
      schedule,
      conflicts: [
        {
          appointmentId: 'appointment-1',
          startsAt: `${addCalendarDays(today, 7)}T14:00:00Z`,
          endsAt: `${addCalendarDays(today, 7)}T15:00:00Z`,
        },
      ],
    })
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Editar turno 08:00 a 13:00' }))
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }))

    expect(await screen.findByText(/1 cita queda fuera del nuevo horario/)).toBeVisible()
    expect(screen.getByRole('link', { name: 'Revisarlas en la agenda' })).toHaveAttribute(
      'href',
      `/app/agenda?fecha=${addCalendarDays(today, 7)}`,
    )
  })
})
