import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { authApi } from '../../infrastructure/http/authApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { reportingApi } from '../../infrastructure/http/reportingApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { MotionProvider } from '../components/MotionProvider'
import { FoundationPage } from './FoundationPage'

vi.mock('../../infrastructure/http/authApi', () => ({
  authApi: { current: vi.fn() },
}))
vi.mock('../../infrastructure/http/reportingApi', () => ({
  reportingApi: { daily: vi.fn() },
}))
vi.mock('../../infrastructure/http/agendaApi', () => ({
  agendaApi: { list: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../../infrastructure/http/salesApi', () => ({
  salesApi: {
    daily: vi.fn().mockResolvedValue({
      date: '2026-09-13',
      draftCount: 0,
      paidCount: 0,
      totalCents: 0,
      cashCents: 0,
      qrCents: 0,
      operations: [],
    }),
  },
}))
vi.mock('../../infrastructure/http/inventoryApi', () => ({
  inventoryApi: { inventory: vi.fn().mockResolvedValue([]) },
}))
vi.mock('../../infrastructure/http/commissionApi', () => ({
  commissionApi: { commissions: vi.fn().mockResolvedValue([]) },
}))

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <MotionProvider>
          <FoundationPage />
        </MotionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('FoundationPage', () => {
  it('shows the owner view when the owner also has the barber role', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'owner',
      userName: 'owner.demo',
      roles: ['OWNER', 'BARBER'],
    })
    vi.mocked(reportingApi.daily).mockResolvedValue({
      date: '2026-09-13',
      appointmentCount: 0,
      appointmentsByStatus: {},
      paidOperationCount: 2,
      chargesCents: 15_000,
      cashCollectedCents: 10_000,
      qrCollectedCents: 5_000,
      appointments: [],
      operations: [],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Lou, hoy.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver reportes/ })).toHaveAttribute(
      'href',
      '/app/reportes',
    )
    expect(salesApi.daily).not.toHaveBeenCalled()
  })

  it('gives the administrator a direct new-appointment action', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })

    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Todo listo para atender.' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Nueva cita/ })).toHaveAttribute('href', '/app/agenda')
  })

  it('keeps the barber home personal and hides inventory data', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Tu jornada, clara.' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Atender llegada directa/ })).toHaveAttribute(
      'href',
      '/app/atenciones',
    )
    expect(inventoryApi.inventory).not.toHaveBeenCalled()
  })
})
