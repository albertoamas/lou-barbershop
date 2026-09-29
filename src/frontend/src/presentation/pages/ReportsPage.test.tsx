import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PeriodReport } from '../../core/reporting/Reporting'
import { authApi } from '../../infrastructure/http/authApi'
import { reportingApi } from '../../infrastructure/http/reportingApi'
import { ReportsPage } from './ReportsPage'

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../../infrastructure/http/reportingApi', () => ({
  reportingApi: {
    daily: vi.fn(),
    period: vi.fn(),
    barbers: vi.fn(),
    audit: vi.fn(),
    exportUrl: vi.fn(
      (kind: string, from: string, to: string) =>
        `/api/v1/reports/export?report=${kind}&dateFrom=${from}&dateTo=${to}`,
    ),
  },
}))

const period: PeriodReport = {
  dateFrom: '2026-09-01',
  dateTo: '2026-09-17',
  paidOperationCount: 1,
  serviceRevenueCents: 5000,
  productRevenueCents: 2000,
  productCostCents: 800,
  averageTicketCents: 7000,
  cashCollectedCents: 3000,
  qrCollectedCents: 4000,
  commissionGeneratedCents: 1500,
  commissionAvailableCents: 1500,
  commissionSettledCents: 0,
  commissionPaidCents: 0,
  commissionPaymentsCents: 0,
  expenseCents: 500,
  inventoryPurchaseCents: 1000,
  approximateOperatingResultCents: 4200,
  cashFlowCents: 5500,
  cashFlowCashCents: 2500,
  cashFlowQrCents: 3000,
  operations: [
    {
      id: 'operation-1',
      date: '2026-09-17',
      barberName: 'Diego',
      customerName: 'Jose',
      serviceQuantity: 1,
      serviceRevenueCents: 5000,
      productQuantity: 1,
      productRevenueCents: 2000,
      productCostCents: 800,
      cashCents: 3000,
      qrCents: 4000,
      totalCents: 7000,
    },
  ],
  commissions: [
    {
      id: 'commission-1',
      date: '2026-09-17',
      barberId: 'barber-1',
      barberName: 'Diego',
      status: 'AVAILABLE',
      amountCents: 1500,
    },
  ],
  expenses: [
    {
      id: 'expense-1',
      date: '2026-09-17',
      category: 'Servicios',
      description: 'Luz',
      method: 'CASH',
      amountCents: 500,
    },
  ],
  inventoryPurchases: [{ id: 'purchase-1', date: '2026-09-17', method: 'QR', amountCents: 1000 }],
  settlementPayments: [],
}

const LocationProbe = () => {
  const location = useLocation()
  return <span data-testid="location">{location.search}</span>
}
const renderPage = (initial = '/app/reportes?desde=2026-09-01&hasta=2026-09-17') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route
            path="/app/reportes"
            element={
              <>
                <ReportsPage />
                <LocationProbe />
              </>
            }
          />
          <Route path="/app/acceso-denegado" element={<p>Acceso restringido</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(authApi.current).mockResolvedValue({
    id: 'owner',
    userName: 'owner.demo',
    roles: ['OWNER', 'BARBER'],
  })
  vi.mocked(reportingApi.period).mockResolvedValue(period)
  vi.mocked(reportingApi.daily).mockResolvedValue({
    date: '2026-09-17',
    appointmentCount: 1,
    appointmentsByStatus: { CONFIRMED: 1 },
    paidOperationCount: 1,
    chargesCents: 7000,
    cashCollectedCents: 3000,
    qrCollectedCents: 4000,
    appointments: [],
    operations: [],
  })
  vi.mocked(reportingApi.barbers).mockResolvedValue([
    {
      barberId: 'barber-1',
      barberName: 'Lou',
      isOwner: true,
      services: 2,
      products: 1,
      revenueCents: 7000,
      productiveMinutes: 60,
      scheduledMinutes: 120,
      occupancyBasisPoints: 5000,
    },
  ])
  vi.mocked(reportingApi.audit).mockResolvedValue({
    total: 1,
    page: 1,
    pageSize: 25,
    items: [
      {
        id: 'audit-1',
        action: 'UPDATED',
        entityType: 'schedule',
        entityId: 'schedule-1',
        actorName: 'Lou',
        createdAt: '2026-09-17T14:00:00Z',
      },
    ],
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ReportsPage', () => {
  it('keeps the same period across tabs and exports only the source supported by the API', async () => {
    renderPage()
    expect(
      await screen.findByRole('heading', { name: 'Operación y resultado' }),
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Descargar operaciones CSV' })
    expect(link).toHaveAttribute(
      'href',
      '/api/v1/reports/export?report=period&dateFrom=2026-09-01&dateTo=2026-09-17',
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Caja' }))
    expect(await screen.findByRole('heading', { name: 'Caja del período' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Descargar.*CSV/ })).not.toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('desde=2026-09-01')
    await userEvent.click(screen.getByRole('tab', { name: 'Equipo' }))
    expect(await screen.findByText('Sin deuda de comisión')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Descargar producción CSV' })).toHaveAttribute(
      'href',
      '/api/v1/reports/export?report=barbers&dateFrom=2026-09-01&dateTo=2026-09-17',
    )
  })

  it('separates purchase, expense and payment sources from the operating result', async () => {
    renderPage('/app/reportes?desde=2026-09-01&hasta=2026-09-17&vista=cash')
    const cash = await screen.findByRole('tabpanel', { name: 'Caja' })
    expect(within(cash).getByText('Compras para reventa')).toBeInTheDocument()
    expect(within(cash).getAllByText('Gastos operativos').length).toBeGreaterThan(0)
    expect(within(cash).getByText('Liquidaciones pagadas')).toBeInTheDocument()
    expect(within(cash).getByText('Recepción confirmada')).toBeInTheDocument()
    expect(within(cash).getByText('Servicios · Luz')).toBeInTheDocument()
  })

  it('does not query economic reports for an administrator', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage()
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
    expect(reportingApi.period).not.toHaveBeenCalled()
    expect(reportingApi.daily).not.toHaveBeenCalled()
    expect(reportingApi.barbers).not.toHaveBeenCalled()
    expect(reportingApi.audit).not.toHaveBeenCalled()
  })

  it('opens audit with the same period and permits filtering by entity', async () => {
    renderPage('/app/reportes?desde=2026-09-01&hasta=2026-09-17&vista=audit')
    expect(await screen.findByRole('heading', { name: 'Auditoría' })).toBeInTheDocument()
    expect(reportingApi.audit).toHaveBeenCalledWith('2026-09-01', '2026-09-17', '', 1)
    await userEvent.type(screen.getByRole('textbox', { name: 'Tipo de entidad' }), 'schedule')
    expect(await screen.findByText('UPDATED · schedule')).toBeInTheDocument()
  })
})
