import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addCalendarDays,
  todayInBusinessTime,
  weekStartFor,
} from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
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
const monday = weekStartFor(today)
const schedule = {
  id: 'schedule-1',
  barberId: 'barber-1',
  weekday: 1,
  startLocalTime: '08:00',
  endLocalTime: '13:00',
  validFrom: addCalendarDays(monday, -7),
  active: true,
  version: 1,
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MotionProvider>
        <SchedulingPage />
      </MotionProvider>
    </QueryClientProvider>,
  )

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
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

describe('SchedulingPage', () => {
  it('presents seven days, active shifts and a contextual schedule editor', async () => {
    renderPage()
    const week = await screen.findByRole('tabpanel', { name: 'Semana' })
    expect((await within(week).findAllByText('Lunes')).length).toBeGreaterThan(0)
    expect(within(week).getByText('Martes')).toBeInTheDocument()
    expect(within(week).getByText('Domingo')).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Editar turno' }))
    const dialog = screen.getByRole('dialog', { name: 'Editar turno' })
    expect(within(dialog).getByLabelText('Inicio')).toHaveValue('08:00')
    await userEvent.clear(within(dialog).getByLabelText('Inicio'))
    await userEvent.type(within(dialog).getByLabelText('Inicio'), '12:00')
    expect(within(dialog).getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() =>
      expect(schedulingApi.updateSchedule).toHaveBeenCalledWith(schedule, {
        weekday: 1,
        startLocalTime: '12:00',
        endLocalTime: '13:00',
        validFrom: schedule.validFrom,
        active: true,
      }),
    )
  })

  it('restricts a barber to the linked profile and hides modification controls', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber-user',
      userName: 'diego',
      roles: ['BARBER'],
    })
    vi.mocked(salesApi.ownBarber).mockResolvedValue({ barberId: 'barber-2' })
    renderPage()
    expect(await screen.findByText('Diego')).toBeInTheDocument()
    expect(vi.mocked(schedulingApi.listSchedules)).toHaveBeenCalledWith('barber-2')
    expect(vi.mocked(schedulingApi.listExceptions)).toHaveBeenCalledWith('barber-2')
    expect(screen.queryByRole('button', { name: 'Agregar turno' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar turno' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Barbero' })).not.toBeInTheDocument()
  })

  it('shows a dated exception in the weekly view and upcoming list', async () => {
    const exceptionDate = addCalendarDays(monday, 9)
    vi.mocked(schedulingApi.listExceptions).mockResolvedValue([
      {
        id: 'exception-1',
        barberId: 'barber-1',
        startsAt: `${exceptionDate}T09:00:00-04:00`,
        endsAt: `${exceptionDate}T10:00:00-04:00`,
        kind: 'UNAVAILABLE',
        reason: 'Ausencia de prueba',
        active: true,
        version: 1,
      },
    ])
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Semana siguiente' }))
    expect(await screen.findByText('Ausencia o bloqueo · 09:00–10:00')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Excepciones' }))
    expect(screen.getByText('Ausencia de prueba')).toBeInTheDocument()
  })
})
