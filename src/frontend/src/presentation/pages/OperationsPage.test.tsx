import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { Operation } from '../../core/sales/Sales'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { MotionProvider } from '../components/MotionProvider'
import { OperationsPage } from './OperationsPage'

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../../infrastructure/http/agendaApi', () => ({
  agendaApi: { customers: vi.fn(), saveCustomer: vi.fn() },
}))
vi.mock('../../infrastructure/http/schedulingApi', () => ({
  schedulingApi: { listBarbers: vi.fn(), listServices: vi.fn() },
}))
vi.mock('../../infrastructure/http/inventoryApi', () => ({ inventoryApi: { inventory: vi.fn() } }))
vi.mock('../../infrastructure/http/salesApi', () => ({
  salesApi: {
    ownBarber: vi.fn(),
    daily: vi.fn(),
    read: vi.fn(),
    openWalkIn: vi.fn(),
    services: vi.fn(),
    products: vi.fn(),
    adjust: vi.fn(),
    ready: vi.fn(),
    pay: vi.fn(),
    reverse: vi.fn(),
  },
}))

const operation = (status: Operation['status']): Operation => ({
  id: 'operation-1',
  customerId: 'customer-1',
  customerName: 'Marco',
  barberId: 'barber-1',
  barberName: 'Diego',
  origin: 'WALK_IN',
  status,
  subtotalCents: 7000,
  discountCents: 0,
  courtesyCents: 0,
  totalCents: 7000,
  version: 3,
  items: [
    {
      id: 'item-1',
      type: 'SERVICE',
      serviceId: 'service-1',
      description: 'Corte',
      unitPriceCents: 7000,
      unitCostCents: 0,
      quantity: 1,
    },
  ],
  payments: status === 'PAID' ? [{ id: 'payment-1', method: 'CASH', amountCents: 7000 }] : [],
})

const renderPage = (opened?: Operation) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter
        initialEntries={[{ pathname: '/app/atenciones', state: opened ? { opened } : null }]}
      >
        <MotionProvider>
          <OperationsPage />
        </MotionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(agendaApi.customers).mockResolvedValue([])
  vi.mocked(schedulingApi.listBarbers).mockResolvedValue([{ id: 'barber-1', displayName: 'Diego' }])
  vi.mocked(schedulingApi.listServices).mockResolvedValue([])
  vi.mocked(inventoryApi.inventory).mockResolvedValue([])
  vi.mocked(salesApi.daily).mockResolvedValue({
    date: '2026-09-16',
    draftCount: 0,
    paidCount: 0,
    totalCents: 0,
    cashCents: 0,
    qrCents: 0,
    operations: [],
  })
  vi.mocked(salesApi.ownBarber).mockResolvedValue({ barberId: 'barber-1' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('OperationsPage', () => {
  it('lets management choose the effective barber for a walk-in', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Abrir llegada directa' }),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText('Barbero que atenderá')).toBeInTheDocument()
    expect(salesApi.ownBarber).not.toHaveBeenCalled()
  })

  it('binds a barber to the own profile without exposing a team selector', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'user-1',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })
    renderPage()

    expect(
      await screen.findByText('La atención quedará asignada únicamente a tu perfil.'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Barbero que atenderá')).not.toBeInTheDocument()
    expect(await screen.findByText('Diego')).toBeInTheDocument()
  })

  it('shows the live payment difference and enables an exact cash payment', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage(operation('READY_TO_PAY'))

    expect(await screen.findByRole('heading', { name: '¿Cómo pagó?' })).toBeInTheDocument()
    expect(screen.getByText('Faltan Bs 70,00')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Todo efectivo' }))
    expect(screen.getByText('Monto exacto · listo para cobrar')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar cobro de Bs\s*70,00/ })).toBeEnabled()
  })

  it('moves to adjustments without rewriting unchanged consumption', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    vi.mocked(schedulingApi.listServices).mockResolvedValue([
      {
        id: 'service-1',
        name: 'Corte',
        active: true,
        defaultDurationMinutes: 30,
        defaultPriceCents: 7000,
      },
    ])
    renderPage(operation('DRAFT'))

    await userEvent.click(
      await screen.findByRole('button', { name: 'Guardar y continuar a ajustes' }),
    )

    expect(
      await screen.findByRole('heading', { name: 'Revisa descuentos o cortesías' }),
    ).toBeInTheDocument()
    expect(salesApi.services).not.toHaveBeenCalled()
    expect(salesApi.products).not.toHaveBeenCalled()
  })

  it('keeps reversal visible only to the owner', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'owner',
      userName: 'owner.demo',
      roles: ['OWNER', 'BARBER'],
    })
    const view = renderPage(operation('PAID'))
    expect(await screen.findByRole('button', { name: 'Revertir operación' })).toBeInTheDocument()
    view.unmount()

    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage(operation('PAID'))
    expect(await screen.findByRole('heading', { name: 'Cobro confirmado' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Revertir operación' })).not.toBeInTheDocument()
  })
})
