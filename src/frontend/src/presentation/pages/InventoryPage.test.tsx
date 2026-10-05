import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { InventoryItem } from '../../core/inventory/Inventory'
import { authApi } from '../../infrastructure/http/authApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { MotionProvider } from '../components/MotionProvider'
import { InventoryPage } from './InventoryPage'

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../../infrastructure/http/configurationApi', () => ({
  configurationApi: { load: vi.fn() },
}))
vi.mock('../../infrastructure/http/inventoryApi', () => ({
  inventoryApi: {
    inventory: vi.fn(),
    movements: vi.fn(),
    receipts: vi.fn(),
    receive: vi.fn(),
    adjust: vi.fn(),
    expenses: vi.fn(),
    createExpense: vi.fn(),
    voidExpense: vi.fn(),
    cashFlow: vi.fn(),
  },
}))

const product: InventoryItem = {
  productId: 'product-1',
  name: 'Cera mate',
  sku: 'CER-1',
  salePriceCents: 5_000,
  averageCostCents: 2_000,
  quantity: 2,
  minimumStock: 3,
  lowStock: true,
  active: true,
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/app/inventario']}>
        <MotionProvider>
          <Routes>
            <Route path="/app/inventario" element={<InventoryPage />} />
            <Route path="/app/acceso-denegado" element={<p>Acceso restringido</p>} />
          </Routes>
        </MotionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.mocked(authApi.current).mockResolvedValue({
    id: 'owner',
    userName: 'owner.demo',
    roles: ['OWNER'],
  })
  vi.mocked(inventoryApi.inventory).mockResolvedValue([product])
  vi.mocked(inventoryApi.receipts).mockResolvedValue([])
  vi.mocked(inventoryApi.expenses).mockResolvedValue([])
  vi.mocked(inventoryApi.movements).mockResolvedValue([
    {
      id: 'movement-1',
      productId: product.productId,
      type: 'PURCHASE_RECEIPT',
      quantityDelta: 2,
      unitCostCents: 2_000,
      occurredAt: '2026-09-16T14:00:00Z',
    },
  ])
  vi.mocked(inventoryApi.cashFlow).mockResolvedValue({
    dateFrom: '2026-09-17',
    dateTo: '2026-09-17',
    salesCashCents: 7_000,
    salesQrCents: 3_000,
    inventoryCashCents: 2_000,
    inventoryQrCents: 0,
    expenseCashCents: 1_000,
    expenseQrCents: 0,
    netCashCents: 4_000,
    netQrCents: 3_000,
  })
  vi.mocked(configurationApi.load).mockResolvedValue({
    users: [],
    staff: [],
    barbers: [],
    services: [],
    products: [],
    expenseCategories: [{ id: 'category-1', name: 'Servicios básicos', active: true, version: 1 }],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('InventoryPage', () => {
  it('shows each product state and opens its sheet with the movement history', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(
      await screen.findByText('1 producto necesita reposición.', { exact: false }),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: /Stock bajo\s*1/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Cera mate/ }))

    const sheet = await screen.findByRole('dialog', { name: 'Ficha del producto' })
    expect(await within(sheet).findByText('Compra recibida')).toBeInTheDocument()
    expect(within(sheet).getByText('+2')).toBeInTheDocument()
  })

  it('restocks from the list with the product chosen and the cost in cents', async () => {
    vi.mocked(inventoryApi.receive).mockResolvedValue({} as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: 'Reponer Cera mate' }))
    const form = await screen.findByRole('dialog', { name: 'Registrar compra' })
    expect(within(form).getByLabelText('Producto 1')).toHaveValue('product-1')
    await user.click(within(form).getByRole('button', { name: 'Agregar uno de Cera mate' }))
    await user.type(within(form).getByLabelText('Costo por unidad, Bs'), '25,50')
    expect(within(form).getAllByText(/Bs\s*51,00/).length).toBeGreaterThan(0)
    await user.click(within(form).getByRole('button', { name: 'Confirmar compra' }))

    expect(inventoryApi.receive).toHaveBeenCalledWith({
      receiptDate: expect.any(String),
      paymentMethod: 'CASH',
      items: [{ productId: 'product-1', quantity: 2, unitCostCents: 2550 }],
    })
  })

  it('corrects stock from a count without asking for signed numbers', async () => {
    vi.mocked(inventoryApi.adjust).mockResolvedValue({} as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /^Cera mate/ }))
    await user.click(await screen.findByRole('button', { name: 'Corregir stock' }))
    const form = await screen.findByRole('dialog', { name: 'Corregir stock' })
    await user.type(within(form).getByLabelText('¿Cuántas hay ahora?'), '1')
    expect(within(form).getByText('Se restan 1 unidad. Quedarán 1.')).toBeInTheDocument()

    await user.click(within(form).getByRole('radio', { name: 'Daño' }))
    await user.type(within(form).getByLabelText('¿Cuántas salen?'), '5')
    expect(within(form).getByRole('alert')).toHaveTextContent('No pueden salir más unidades')
    expect(within(form).getByRole('button', { name: 'Guardar corrección' })).toBeDisabled()

    await user.clear(within(form).getByLabelText('¿Cuántas salen?'))
    await user.type(within(form).getByLabelText('¿Cuántas salen?'), '1')
    await user.type(within(form).getByLabelText('Motivo'), 'Se cayó')
    await user.click(within(form).getByRole('button', { name: 'Guardar corrección' }))
    expect(inventoryApi.adjust).toHaveBeenCalledWith('product-1', {
      quantityDelta: -1,
      type: 'DAMAGE',
      reason: 'Se cayó',
    })
  })

  it('registers a paid expense with a category chip and QR, in cents', async () => {
    vi.mocked(inventoryApi.createExpense).mockResolvedValue({} as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('button', { name: /Registrar gasto/ }))
    const form = await screen.findByRole('dialog', { name: 'Registrar gasto' })
    await user.click(await within(form).findByRole('radio', { name: 'Servicios básicos' }))
    await user.type(within(form).getByLabelText('Concepto'), 'Luz')
    await user.type(within(form).getByLabelText('Importe, Bs'), '45,50')
    await user.click(within(form).getByRole('radio', { name: 'QR' }))
    await user.click(within(form).getByRole('button', { name: /Registrar gasto de Bs\s*45,50/ }))

    expect(inventoryApi.createExpense).toHaveBeenCalledWith({
      categoryId: 'category-1',
      expenseDate: expect.any(String),
      description: 'Luz',
      amountCents: 4550,
      paymentMethod: 'QR',
    })
  })

  it('shows what is left in the till by payment method', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(await screen.findByRole('tab', { name: 'Caja de hoy' }))
    const cash = await screen.findByRole('region', { name: 'Efectivo' })
    expect(within(cash).getByText(/menos Bs\s*20,00/)).toBeInTheDocument()
    expect(within(cash).getByText(/Bs\s*40,00/)).toBeInTheDocument()
  })

  it('does not load inventory data for a barber opening the URL directly', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber',
      userName: 'barber',
      roles: ['BARBER'],
    })
    renderPage()

    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
    expect(inventoryApi.inventory).not.toHaveBeenCalled()
  })
})
