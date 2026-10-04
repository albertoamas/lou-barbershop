import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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

const pendingOperations = {
  date: '2026-09-13',
  draftCount: 1,
  paidCount: 0,
  totalCents: 0,
  cashCents: 0,
  qrCents: 0,
  operations: [{ status: 'DRAFT' }, { status: 'READY_TO_PAY' }, { status: 'PAID' }] as never,
}

describe('FoundationPage', () => {
  it('leads the owner with what was charged and links each figure to its screen', async () => {
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
    vi.mocked(salesApi.daily).mockResolvedValueOnce(pendingOperations)

    renderPage()

    const charged = await screen.findByRole('link', { name: /Cobrado hoy/ })
    expect(charged).toHaveAttribute('href', '/app/reportes')
    await waitFor(() => expect(charged).toHaveTextContent(/Bs\s*150,00/))
    expect(charged).toHaveTextContent('2 atenciones pagadas')
    // Open and ready attentions both count as pending, as on the charge screen.
    expect(await screen.findByRole('link', { name: /Por cobrar\s*2/ })).toHaveAttribute(
      'href',
      '/app/atenciones',
    )
    expect(screen.getByRole('link', { name: /Por liquidar/ })).toHaveAttribute(
      'href',
      '/app/comisiones',
    )
  })

  it('gives reception who is in the shop and both ways to start', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'En el local' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Próximas llegadas' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Nueva cita/ })).toHaveAttribute('href', '/app/agenda')
    expect(screen.getByRole('link', { name: /Llegada sin cita/ })).toHaveAttribute(
      'href',
      '/app/atenciones',
    )
    expect(screen.getByRole('navigation', { name: 'Ahora en el local' })).toBeInTheDocument()
  })

  it('keeps the barber home personal and hides inventory data', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Mi día' })).toBeInTheDocument()
    expect(await screen.findByText('No tienes más citas hoy')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Llegada sin cita/ })).toHaveAttribute(
      'href',
      '/app/atenciones',
    )
    expect(screen.queryByRole('link', { name: /Nueva cita/ })).not.toBeInTheDocument()
    expect(inventoryApi.inventory).not.toHaveBeenCalled()
  })
})
