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
const custom = '/app/reportes?periodo=fechas&desde=2026-09-01&hasta=2026-09-17'
const renderPage = (initial = custom) =>
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
  // The comparison period sold half as much.
  vi.mocked(reportingApi.period).mockImplementation((from) =>
    Promise.resolve(
      from === '2026-09-01'
        ? period
        : {
            ...period,
            serviceRevenueCents: 2500,
            productRevenueCents: 1000,
            paidOperationCount: 1,
            averageTicketCents: 7000,
            operations: [],
          },
    ),
  )
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
        action: 'Modified',
        entityType: 'settlement',
        entityId: 'settlement-1',
        actorName: 'Lou',
        beforeData: '{"Status": 1}',
        afterData: '{"Status": 2}',
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
  it('summarises the period against the previous one and explains the result', async () => {
    renderPage()
    expect(
      await screen.findByText('Comparado con el periodo del 15 ago a 31 ago 2026.'),
    ).toBeInTheDocument()
    expect(reportingApi.period).toHaveBeenCalledWith('2026-08-15', '2026-08-31')
    expect(await screen.findAllByText('100 % más')).toHaveLength(1)
    expect(screen.getAllByText('Igual')).toHaveLength(2)
    expect(screen.getByText('Resultado: ganancia')).toBeInTheDocument()
    expect(screen.getByText('Jose, con Diego')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Descargar CSV' })).toHaveAttribute(
      'href',
      '/api/v1/reports/export?report=period&dateFrom=2026-09-01&dateTo=2026-09-17',
    )
  })

  it('switches periods with one tap and keeps them in the address', async () => {
    renderPage('/app/reportes')
    await screen.findByRole('tab', { name: 'Resumen' })
    expect(screen.getByRole('button', { name: 'Este mes' })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'Mes pasado' }))
    expect(screen.getByTestId('location')).toHaveTextContent('periodo=mes-pasado')
    await userEvent.click(screen.getByRole('button', { name: 'Elegir fechas' }))
    expect(screen.getByLabelText('Desde')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('periodo=fechas')
  })

  it('separates money in, money out and commission debt', async () => {
    renderPage(`${custom}&vista=dinero`)
    const money = await screen.findByRole('tabpanel', { name: 'Dinero' })
    expect(await within(money).findByRole('heading', { name: 'Entró' })).toBeInTheDocument()
    expect(within(money).getByText('Compra de productos')).toBeInTheDocument()
    expect(within(money).getByText('Servicios: Luz')).toBeInTheDocument()
    expect(within(money).getByRole('link', { name: /Ir a Comisiones/ })).toBeInTheDocument()
  })

  it('shows team production and exports it', async () => {
    renderPage(`${custom}&vista=equipo`)
    expect(await screen.findByText('50 % del horario con citas')).toBeInTheDocument()
    expect(screen.getByText('Dueño')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Descargar CSV' })).toHaveAttribute(
      'href',
      '/api/v1/reports/export?report=barbers&dateFrom=2026-09-01&dateTo=2026-09-17',
    )
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
    expect(reportingApi.barbers).not.toHaveBeenCalled()
    expect(reportingApi.audit).not.toHaveBeenCalled()
  })

  it('tells who did what in plain words and filters by kind', async () => {
    renderPage(`${custom}&vista=actividad`)
    expect(await screen.findByText('registró el pago de una liquidación')).toBeInTheDocument()
    expect(reportingApi.audit).toHaveBeenCalledWith('2026-09-01', '2026-09-17', '', 1)
    expect(screen.queryByRole('link', { name: 'Descargar CSV' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Liquidaciones' }))
    expect(reportingApi.audit).toHaveBeenLastCalledWith('2026-09-01', '2026-09-17', 'settlement', 1)
  })
})
