import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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

const admin = { id: 'admin', userName: 'admin.demo', roles: ['ADMIN'] }
const owner = { id: 'owner', userName: 'owner.demo', roles: ['OWNER', 'BARBER'] }

const operation = (status: Operation['status'], extra: Partial<Operation> = {}): Operation => ({
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
  ...extra,
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

const daily = (operations: Operation[] = []) => ({
  date: '2026-09-16',
  draftCount: 0,
  paidCount: operations.filter((item) => item.status === 'PAID').length,
  totalCents: 0,
  cashCents: 0,
  qrCents: 0,
  operations,
})

beforeEach(() => {
  vi.mocked(agendaApi.customers).mockResolvedValue([])
  vi.mocked(schedulingApi.listBarbers).mockResolvedValue([{ id: 'barber-1', displayName: 'Diego' }])
  vi.mocked(schedulingApi.listServices).mockResolvedValue([
    {
      id: 'service-1',
      name: 'Corte',
      active: true,
      defaultDurationMinutes: 30,
      defaultPriceCents: 7000,
    },
  ])
  vi.mocked(inventoryApi.inventory).mockResolvedValue([])
  vi.mocked(salesApi.daily).mockResolvedValue(daily())
  vi.mocked(salesApi.ownBarber).mockResolvedValue({ barberId: 'barber-1' })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('OperationsPage', () => {
  it('puts who is waiting to pay before what was already charged', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(salesApi.daily).mockResolvedValue(
      daily([
        operation('PAID', { id: 'paid', customerName: 'Luis' }),
        operation('DRAFT', { id: 'open', customerName: 'Marco' }),
      ]),
    )
    renderPage()

    const pending = await screen.findByRole('region', { name: /Por cobrar/ })
    expect(within(pending).getByRole('button', { name: /Marco/ })).toBeInTheDocument()
    expect(within(pending).queryByRole('button', { name: /Luis/ })).not.toBeInTheDocument()
    const closed = screen.getByRole('region', { name: /Cobradas/ })
    expect(within(closed).getByRole('button', { name: /Luis/ })).toBeInTheDocument()
  })

  it('lets management choose who attends a walk-in', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Llegada sin cita' }))

    expect(await screen.findByRole('heading', { name: '¿Quién llegó?' })).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: 'Diego' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(salesApi.ownBarber).not.toHaveBeenCalled()
  })

  it('binds a barber walk-in to the own profile without a team selector', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'user-1',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Llegada sin cita' }))

    expect(await screen.findByText('La atención queda a tu nombre.')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Barbero que atiende' })).not.toBeInTheDocument()
  })

  it('goes to the charge step without rewriting an unchanged consumption', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    renderPage(operation('DRAFT'))

    await userEvent.click(await screen.findByRole('button', { name: 'Revisar y cobrar' }))

    expect(await screen.findByRole('heading', { name: '¿Cómo pagó?' })).toBeInTheDocument()
    expect(salesApi.services).not.toHaveBeenCalled()
    expect(salesApi.products).not.toHaveBeenCalled()
  })

  it('counts products with minus and plus and never sells what is out of stock', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(inventoryApi.inventory).mockResolvedValue([
      {
        productId: 'wax',
        name: 'Cera',
        salePriceCents: 4500,
        quantity: 2,
        minimumStock: 1,
        lowStock: false,
        active: true,
      },
      {
        productId: 'balm',
        name: 'Bálsamo',
        salePriceCents: 5500,
        quantity: 0,
        minimumStock: 1,
        lowStock: true,
        active: true,
      },
    ])
    vi.mocked(salesApi.products).mockResolvedValue(operation('DRAFT'))
    renderPage(operation('DRAFT'))
    const user = userEvent.setup()

    const add = await screen.findByRole('button', { name: 'Agregar uno de Cera' })
    await user.click(add)
    await user.click(add)
    expect(add).toBeDisabled()
    expect(screen.getByText(/Sin stock/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar uno de Bálsamo' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Revisar y cobrar' }))
    await waitFor(() =>
      expect(salesApi.products).toHaveBeenCalledWith(expect.anything(), [
        { productId: 'wax', quantity: 2 },
      ]),
    )
  })

  it('asks how the customer paid and shows the change for cash', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(salesApi.pay).mockResolvedValue(operation('PAID'))
    renderPage(operation('READY_TO_PAY'))
    const user = userEvent.setup()

    const charge = await screen.findByRole('button', { name: /Cobrar Bs\s*70,00/ })
    expect(charge).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Efectivo/ }))
    await user.type(screen.getByLabelText(/¿Cuánto entregó\?/), '100')
    expect(screen.getByText('Vuelto')).toBeInTheDocument()
    expect(screen.getByText(/Bs\s*30,00/)).toBeInTheDocument()

    await user.click(charge)

    await waitFor(() =>
      expect(salesApi.pay).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'operation-1' }),
        [{ method: 'CASH', amountCents: 7000 }],
        expect.any(String),
      ),
    )
    expect(await screen.findByText('Cobro registrado', { selector: 'span' })).toBeInTheDocument()
  })

  it('splits a mixed payment and closes a draft before charging it', async () => {
    vi.mocked(authApi.current).mockResolvedValue(admin)
    vi.mocked(salesApi.ready).mockResolvedValue(operation('READY_TO_PAY', { version: 4 }))
    vi.mocked(salesApi.pay).mockResolvedValue(operation('PAID'))
    renderPage(operation('DRAFT'))
    const user = userEvent.setup()

    await user.click(await screen.findByRole('button', { name: 'Revisar y cobrar' }))
    await user.click(await screen.findByRole('button', { name: /Mixto/ }))
    await user.type(screen.getByLabelText('Parte en efectivo'), '30')
    expect(screen.getByText(/Bs\s*40,00/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Cobrar Bs\s*70,00/ }))

    await waitFor(() =>
      expect(salesApi.pay).toHaveBeenCalledWith(
        expect.objectContaining({ version: 4 }),
        [
          { method: 'CASH', amountCents: 3000 },
          { method: 'QR', amountCents: 4000 },
        ],
        expect.any(String),
      ),
    )
    expect(salesApi.ready).toHaveBeenCalledOnce()
  })

  it('offers discounts only to management', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'user-1',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })
    renderPage(operation('DRAFT'))
    await userEvent.click(await screen.findByRole('button', { name: 'Revisar y cobrar' }))

    expect(await screen.findByRole('heading', { name: '¿Cómo pagó?' })).toBeInTheDocument()
    expect(screen.queryByText('Aplicar descuento o cortesía')).not.toBeInTheDocument()
  })

  it('keeps the reversal tucked away and only for the owner', async () => {
    vi.mocked(authApi.current).mockResolvedValue(owner)
    const view = renderPage(operation('PAID'))
    expect(await screen.findByRole('button', { name: 'Atender al siguiente' })).toBeInTheDocument()
    expect(await screen.findByText('Más opciones')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Revertir cobro', hidden: true })).toBeDisabled()
    view.unmount()

    vi.mocked(authApi.current).mockResolvedValue(admin)
    renderPage(operation('PAID'))
    expect(await screen.findByRole('button', { name: 'Atender al siguiente' })).toBeInTheDocument()
    expect(screen.queryByText('Más opciones')).not.toBeInTheDocument()
  })
})
