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
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
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
  it('shows stock alerts before the tabs and opens immutable movement history', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: '1 producto con stock bajo' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Existencias' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    await userEvent.click(screen.getAllByRole('button', { name: 'Historial' })[0]!)
    const dialog = await screen.findByRole('dialog', { name: 'Historial de producto' })
    expect(await within(dialog).findByText('Compra recibida')).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Borrar' })).not.toBeInTheDocument()
  })

  it('converts purchase unit cost from bolivianos before sending the receipt', async () => {
    vi.mocked(inventoryApi.receive).mockResolvedValue({
      id: 'receipt-1',
      receiptDate: '2026-09-17',
      paymentMethod: 'CASH',
      totalCents: 5_100,
      status: 'CONFIRMED',
      items: [],
    })
    renderPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Compras' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar compra' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar compra' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Producto'), 'product-1')
    await userEvent.type(within(dialog).getByLabelText('Cantidad'), '2')
    await userEvent.type(within(dialog).getByLabelText('Costo unitario en Bs'), '25,50')
    await userEvent.click(
      within(dialog).getByRole('button', { name: /Confirmar compra de Bs\s*51,00/ }),
    )

    expect(inventoryApi.receive).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ productId: 'product-1', quantity: 2, unitCostCents: 2_550 }],
      }),
    )
  })

  it('rejects an adjustment that would make stock negative', async () => {
    renderPage()

    await userEvent.click((await screen.findAllByRole('button', { name: 'Ajustar' }))[0]!)
    const dialog = screen.getByRole('dialog', { name: 'Ajustar inventario' })
    await userEvent.type(within(dialog).getByLabelText('Cambio de unidades'), '-3')
    await userEvent.type(within(dialog).getByLabelText('Motivo'), 'Conteo físico')

    expect(
      within(dialog).getByText('El ajuste no puede dejar existencias negativas.'),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Registrar ajuste' })).toBeDisabled()
    expect(inventoryApi.adjust).not.toHaveBeenCalled()
  })

  it('converts a paid operating expense to cents without treating it as a purchase', async () => {
    vi.mocked(inventoryApi.createExpense).mockResolvedValue({
      id: 'expense-1',
      categoryId: 'category-1',
      categoryName: 'Servicios básicos',
      expenseDate: '2026-09-17',
      description: 'Luz',
      amountCents: 4_550,
      paymentMethod: 'CASH',
      status: 'RECORDED',
      version: 1,
    })
    renderPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Gastos' }))
    await userEvent.click(screen.getByRole('button', { name: 'Registrar gasto' }))
    const dialog = screen.getByRole('dialog', { name: 'Registrar gasto' })
    await userEvent.selectOptions(within(dialog).getByLabelText('Categoría'), 'category-1')
    await userEvent.type(within(dialog).getByLabelText('Concepto'), 'Luz')
    await userEvent.type(within(dialog).getByLabelText('Importe en Bs'), '45,50')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Registrar gasto pagado' }))

    expect(inventoryApi.createExpense).toHaveBeenCalledWith(
      expect.objectContaining({ description: 'Luz', amountCents: 4_550 }),
    )
    expect(inventoryApi.receive).not.toHaveBeenCalled()
  })

  it('does not load inventory data for a barber opening the URL directly', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })
    renderPage()

    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
    expect(inventoryApi.inventory).not.toHaveBeenCalled()
    expect(inventoryApi.cashFlow).not.toHaveBeenCalled()
  })
})
