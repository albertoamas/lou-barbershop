import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { bolivianosToCents, centsToBolivianos } from '../../core/configuration/Configuration'
import {
  filterStock,
  movementLabel,
  receiptTotal,
  stockAlerts,
  type Expense,
  type InventoryItem,
  type MovementType,
} from '../../core/inventory/Inventory'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import type { PaymentMethod } from '../../core/sales/Sales'
import { authApi } from '../../infrastructure/http/authApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  panelClassName,
} from '../styles/formStyles'

type InventoryTab = 'stock' | 'purchases' | 'expenses' | 'cash'
type Panel = 'receipt' | 'adjustment' | 'expense' | 'void' | 'movements' | null
type ReceiptRow = { productId: string; quantity: string; unitCost: string }

const tabs: { id: InventoryTab; label: string }[] = [
  { id: 'stock', label: 'Existencias' },
  { id: 'purchases', label: 'Compras' },
  { id: 'expenses', label: 'Gastos' },
  { id: 'cash', label: 'Caja de hoy' },
]
const sectionTitleClassName = 'font-display text-2xl font-bold sm:text-3xl'
const paymentLabel = (method: PaymentMethod) => (method === 'CASH' ? 'Efectivo' : 'QR')
const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00-04:00`),
  )
const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/La_Paz',
  }).format(new Date(value))

export const InventoryPage = () => {
  const today = todayInBusinessTime()
  const online = useConnectivity() === 'online'
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock')
  const [panel, setPanel] = useState<Panel>(null)
  const [search, setSearch] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem>()
  const [selectedExpense, setSelectedExpense] = useState<Expense>()
  const [receiptDate, setReceiptDate] = useState(today)
  const [receiptMethod, setReceiptMethod] = useState<PaymentMethod>('CASH')
  const [receiptRows, setReceiptRows] = useState<ReceiptRow[]>([
    { productId: '', quantity: '', unitCost: '' },
  ])
  const [adjustmentType, setAdjustmentType] = useState<MovementType>('COUNT_ADJUSTMENT')
  const [quantityDelta, setQuantityDelta] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [expense, setExpense] = useState({
    categoryId: '',
    expenseDate: today,
    description: '',
    amount: '',
    paymentMethod: 'CASH' as PaymentMethod,
  })
  const [voidReason, setVoidReason] = useState('')
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [busy, setBusy] = useState(false)

  const inventory = useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryApi.inventory,
    enabled: canManage,
  })
  const receipts = useQuery({
    queryKey: ['inventory', 'receipts'],
    queryFn: inventoryApi.receipts,
    enabled: canManage,
  })
  const expenses = useQuery({
    queryKey: ['expenses'],
    queryFn: inventoryApi.expenses,
    enabled: canManage,
  })
  const configuration = useQuery({
    queryKey: ['configuration'],
    queryFn: configurationApi.load,
    enabled: canManage,
  })
  const cashFlow = useQuery({
    queryKey: ['cash-flow', today],
    queryFn: () => inventoryApi.cashFlow(today, today),
    enabled: canManage,
  })
  const movements = useQuery({
    queryKey: ['inventory', 'movements', selectedProduct?.productId],
    queryFn: () => inventoryApi.movements(selectedProduct!.productId),
    enabled: canManage && panel === 'movements' && Boolean(selectedProduct),
  })

  const alerts = stockAlerts(inventory.data)
  const visibleStock = filterStock(inventory.data, search, onlyLow)
  const activeProducts = inventory.data?.filter((item) => item.active) ?? []
  const parsedReceiptRows = useMemo(
    () =>
      receiptRows.map((row) => ({
        productId: row.productId,
        quantity: Number(row.quantity),
        unitCostCents: bolivianosToCents(row.unitCost),
      })),
    [receiptRows],
  )
  const receiptIsValid =
    parsedReceiptRows.length > 0 &&
    parsedReceiptRows.every(
      (row) =>
        row.productId &&
        Number.isSafeInteger(row.quantity) &&
        row.quantity > 0 &&
        row.unitCostCents !== null &&
        row.unitCostCents > 0,
    ) &&
    new Set(parsedReceiptRows.map((row) => row.productId)).size === parsedReceiptRows.length
  const receiptAmount = receiptIsValid
    ? receiptTotal(
        parsedReceiptRows.map((row) => ({
          quantity: row.quantity,
          unitCostCents: row.unitCostCents!,
        })),
      )
    : 0
  const expenseAmountCents = bolivianosToCents(expense.amount)
  const adjustmentQuantity = Number(quantityDelta)
  const adjustmentIsValid =
    quantityDelta.trim() !== '' &&
    Number.isSafeInteger(adjustmentQuantity) &&
    adjustmentQuantity !== 0 &&
    selectedProduct !== undefined &&
    selectedProduct.quantity + adjustmentQuantity >= 0 &&
    Boolean(adjustmentReason.trim()) &&
    (adjustmentType === 'COUNT_ADJUSTMENT' || adjustmentQuantity < 0)

  const refresh = async () => {
    await Promise.all([
      inventory.refetch(),
      receipts.refetch(),
      expenses.refetch(),
      cashFlow.refetch(),
    ])
  }
  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true)
    setNotice('')
    try {
      await action()
      await refresh()
      setNoticeIsError(false)
      setNotice(message)
      setPanel(null)
    } catch (error) {
      setNoticeIsError(true)
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }
  const updateReceiptRow = (index: number, patch: Partial<ReceiptRow>) =>
    setReceiptRows((rows) =>
      rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    )
  const openAdjustment = (item: InventoryItem) => {
    setSelectedProduct(item)
    setAdjustmentType('COUNT_ADJUSTMENT')
    setQuantityDelta('')
    setAdjustmentReason('')
    setPanel('adjustment')
  }
  const openMovements = (item: InventoryItem) => {
    setSelectedProduct(item)
    setPanel('movements')
  }

  if (session.isPending) {
    return (
      <main className="p-6" role="status">
        Cargando permisos…
      </main>
    )
  }
  if (!canManage) return <Navigate to="/app/acceso-denegado" replace />

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b border-lou-fog pb-7">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
          Operación comercial
        </p>
        <h1 className="m-0 font-display text-5xl leading-[0.9] font-bold sm:text-6xl">
          Inventario y gastos
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
          Controla existencias, compras de reventa y gastos pagados sin duplicar salidas de caja.
        </p>
      </header>

      {!online && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Sin conexión: puedes consultar datos guardados, pero no modificar inventario, compras o
          gastos.
        </p>
      )}
      {notice && (
        <p
          className={cn(
            'mt-5',
            noticeIsError
              ? errorClassName
              : 'rounded-xl border border-emerald-800/20 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950',
          )}
          role={noticeIsError ? 'alert' : 'status'}
        >
          {notice}
        </p>
      )}

      {inventory.isPending ? (
        <p className={`mt-5 ${panelClassName}`} role="status">
          Cargando existencias…
        </p>
      ) : inventory.isError ? (
        <p className={`mt-5 ${errorClassName}`} role="alert">
          No se pudieron cargar las existencias.{' '}
          <button className="font-bold underline" onClick={() => void inventory.refetch()}>
            Reintentar
          </button>
        </p>
      ) : (
        <section
          className={cn(
            'mt-5 rounded-2xl border p-4 sm:p-5',
            alerts.length ? 'border-amber-800/20 bg-amber-50' : 'border-lou-fog bg-white',
          )}
          aria-label="Alertas de stock"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.18em] uppercase text-lou-graphite/50">
                Antes de operar
              </p>
              <h2 className="font-display text-2xl font-bold">
                {alerts.length
                  ? `${alerts.length} producto${alerts.length === 1 ? '' : 's'} con stock bajo`
                  : 'Existencias bajo control'}
              </h2>
            </div>
            {alerts.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => {
                  setActiveTab('stock')
                  setOnlyLow(true)
                }}
              >
                Ver stock bajo
              </Button>
            )}
          </div>
          <p className="mt-1 text-sm text-lou-graphite/60">
            {alerts.length
              ? alerts.map((item) => item.name).join(' · ')
              : 'No hay productos activos por debajo de su mínimo.'}
          </p>
        </section>
      )}

      <div
        className="sticky top-0 z-10 mt-5 border-b border-lou-fog bg-lou-paper/95 py-2 backdrop-blur-sm"
        role="tablist"
        aria-label="Secciones de inventario y caja"
      >
        <div className="grid grid-cols-2 gap-1 sm:flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`inventory-tab-${tab.id}`}
              aria-controls={`inventory-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              className={cn(
                'min-h-11 rounded-xl px-3 text-sm font-bold transition-colors duration-200 sm:px-4',
                activeTab === tab.id
                  ? 'bg-lou-ink text-white'
                  : 'text-lou-graphite/60 hover:bg-white hover:text-lou-ink',
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'stock' && (
        <section
          className={`mt-5 ${panelClassName}`}
          role="tabpanel"
          id="inventory-panel-stock"
          aria-labelledby="inventory-tab-stock"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                Existencia actual
              </p>
              <h2 className={sectionTitleClassName}>Productos</h2>
            </div>
            <p className="text-xs text-lou-graphite/55">
              Cada cambio queda como movimiento histórico.
            </p>
          </div>
          <div className="sticky top-26 z-10 mt-5 grid gap-3 bg-white py-3 sm:top-15 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className={labelClassName}>
              Buscar producto o SKU
              <input
                className={fieldClassName}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o código"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={onlyLow}
                onChange={(event) => setOnlyLow(event.target.checked)}
              />{' '}
              Sólo stock bajo
            </label>
          </div>
          {inventory.isPending && <p role="status">Cargando productos…</p>}
          {inventory.isError && (
            <p className={errorClassName} role="alert">
              No se pudieron cargar los productos.{' '}
              <button className="font-bold underline" onClick={() => void inventory.refetch()}>
                Reintentar
              </button>
            </p>
          )}
          {inventory.isSuccess && visibleStock.length === 0 && (
            <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
              No hay productos para este filtro.
            </p>
          )}
          {visibleStock.length > 0 && (
            <>
              <div className="grid gap-2 md:hidden">
                {visibleStock.map((item) => (
                  <article key={item.productId} className="rounded-xl border border-lou-fog p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong>{item.name}</strong>
                        <p className="text-xs text-lou-graphite/50">{item.sku || 'Sin SKU'}</p>
                      </div>
                      <span
                        className={cn(
                          'rounded-full px-2.5 py-1 text-xs font-bold',
                          item.lowStock && item.active
                            ? 'bg-amber-50 text-amber-950'
                            : 'bg-lou-fog text-lou-graphite/70',
                        )}
                      >
                        {item.lowStock && item.active
                          ? 'Stock bajo'
                          : item.active
                            ? 'Disponible'
                            : 'Inactivo'}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between border-t border-lou-fog pt-3">
                      <div>
                        <strong className="font-display text-3xl tabular-nums">
                          {item.quantity}
                        </strong>
                        <span className="ml-2 text-xs text-lou-graphite/50">
                          unid. · mínimo {item.minimumStock}
                        </span>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">
                        {centsToBolivianos(item.salePriceCents)}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="secondary" onClick={() => openMovements(item)}>
                        Historial
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!online || busy || !item.active}
                        onClick={() => openAdjustment(item)}
                      >
                        Ajustar
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-lou-fog text-xs text-lou-graphite/50">
                      <th className="py-3">Producto</th>
                      <th className="py-3 text-right">Existencia</th>
                      <th className="py-3 text-right">Mínimo</th>
                      <th className="py-3 text-right">Precio venta</th>
                      <th className="py-3 text-right">Estado</th>
                      <th className="py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStock.map((item) => (
                      <tr key={item.productId} className="border-b border-lou-fog/70 last:border-0">
                        <td className="py-3">
                          <strong>{item.name}</strong>
                          <span className="block text-xs text-lou-graphite/50">
                            {item.sku || 'Sin SKU'}
                          </span>
                        </td>
                        <td className="py-3 text-right font-bold tabular-nums">{item.quantity}</td>
                        <td className="py-3 text-right tabular-nums">{item.minimumStock}</td>
                        <td className="py-3 text-right tabular-nums">
                          {centsToBolivianos(item.salePriceCents)}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={cn(
                              'rounded-full px-2 py-1 text-xs font-bold',
                              item.lowStock && item.active
                                ? 'bg-amber-50 text-amber-950'
                                : 'bg-lou-fog text-lou-graphite/70',
                            )}
                          >
                            {item.lowStock && item.active
                              ? 'Stock bajo'
                              : item.active
                                ? 'Disponible'
                                : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" onClick={() => openMovements(item)}>
                              Historial
                            </Button>
                            <Button
                              variant="ghost"
                              disabled={!online || busy || !item.active}
                              onClick={() => openAdjustment(item)}
                            >
                              Ajustar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'purchases' && (
        <section
          className={`mt-5 ${panelClassName}`}
          role="tabpanel"
          id="inventory-panel-purchases"
          aria-labelledby="inventory-tab-purchases"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                Entrada de productos
              </p>
              <h2 className={sectionTitleClassName}>Compras de reventa</h2>
            </div>
            <Button
              disabled={!online || activeProducts.length === 0}
              onClick={() => setPanel('receipt')}
            >
              Registrar compra
            </Button>
          </div>
          <p className="mt-2 text-sm text-lou-graphite/60">
            La compra aumenta existencias y sale de caja. No vuelve a registrarse como gasto
            operativo.
          </p>
          <div className="mt-5 grid gap-2">
            {receipts.isPending && <p role="status">Cargando compras…</p>}
            {receipts.isError && (
              <p className={errorClassName} role="alert">
                No se pudieron cargar las compras.{' '}
                <button className="font-bold underline" onClick={() => void receipts.refetch()}>
                  Reintentar
                </button>
              </p>
            )}
            {receipts.data?.length === 0 && (
              <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
                Todavía no hay compras registradas.
              </p>
            )}
            {receipts.data?.map((receipt) => (
              <details key={receipt.id} className="group rounded-xl border border-lou-fog p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span>
                    <strong>{formatDate(receipt.receiptDate)}</strong>
                    <span className="block text-xs text-lou-graphite/55">
                      {receipt.items.length} producto{receipt.items.length === 1 ? '' : 's'} ·{' '}
                      {paymentLabel(receipt.paymentMethod)} ·{' '}
                      {receipt.status === 'REVERSED' ? 'Revertida' : 'Confirmada'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <strong className="tabular-nums">
                      {centsToBolivianos(receipt.totalCents)}
                    </strong>
                    <AppIcon name="chevron-down" size={17} />
                  </span>
                </summary>
                <div className="mt-4 grid gap-2 border-t border-lou-fog pt-3 text-sm">
                  {receipt.items.map((item) => (
                    <div key={item.id} className="flex justify-between gap-3">
                      <span>
                        {item.productName} × {item.quantity}{' '}
                        <small className="text-lou-graphite/50">
                          a {centsToBolivianos(item.unitCostCents)}
                        </small>
                      </span>
                      <strong className="tabular-nums">
                        {centsToBolivianos(item.lineTotalCents)}
                      </strong>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'expenses' && (
        <section
          className={`mt-5 ${panelClassName}`}
          role="tabpanel"
          id="inventory-panel-expenses"
          aria-labelledby="inventory-tab-expenses"
        >
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                Salidas operativas
              </p>
              <h2 className={sectionTitleClassName}>Gastos pagados</h2>
            </div>
            <Button disabled={!online} onClick={() => setPanel('expense')}>
              Registrar gasto
            </Button>
          </div>
          <p className="mt-2 text-sm text-lou-graphite/60">
            Aquí van los gastos operativos. Las compras de productos para reventa tienen su propia
            pestaña.
          </p>
          <div className="mt-5 grid gap-2">
            {expenses.isPending && <p role="status">Cargando gastos…</p>}
            {expenses.isError && (
              <p className={errorClassName} role="alert">
                No se pudieron cargar los gastos.{' '}
                <button className="font-bold underline" onClick={() => void expenses.refetch()}>
                  Reintentar
                </button>
              </p>
            )}
            {expenses.data?.length === 0 && (
              <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
                Todavía no hay gastos registrados.
              </p>
            )}
            {expenses.data?.map((row) => (
              <article
                key={row.id}
                className="flex flex-col justify-between gap-3 rounded-xl border border-lou-fog p-4 sm:flex-row sm:items-center"
              >
                <div>
                  <strong>{row.description}</strong>
                  <p className="mt-1 text-xs text-lou-graphite/55">
                    {formatDate(row.expenseDate)} · {row.categoryName} ·{' '}
                    {paymentLabel(row.paymentMethod)} ·{' '}
                    {row.status === 'VOIDED' ? 'Anulado' : 'Registrado'}
                  </p>
                  {row.voidReason && (
                    <p className="mt-1 text-xs text-lou-danger">Motivo: {row.voidReason}</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <strong className="font-display text-xl tabular-nums">
                    {centsToBolivianos(row.amountCents)}
                  </strong>
                  {row.status === 'RECORDED' && (
                    <Button
                      variant="ghost"
                      disabled={!online || busy}
                      onClick={() => {
                        setSelectedExpense(row)
                        setVoidReason('')
                        setPanel('void')
                      }}
                    >
                      Anular
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'cash' && (
        <section
          className={`mt-5 ${panelClassName}`}
          role="tabpanel"
          id="inventory-panel-cash"
          aria-labelledby="inventory-tab-cash"
        >
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
            {formatDate(today)}
          </p>
          <h2 className={sectionTitleClassName}>Caja de hoy</h2>
          <p className="mt-2 text-sm text-lou-graphite/60">
            Entradas por ventas y salidas por compras de reventa y gastos, separadas por medio de
            pago.
          </p>
          {cashFlow.isPending && (
            <p className="mt-5" role="status">
              Cargando flujo de caja…
            </p>
          )}
          {cashFlow.isError && (
            <p className={`mt-5 ${errorClassName}`} role="alert">
              No se pudo cargar el flujo de caja.{' '}
              <button className="font-bold underline" onClick={() => void cashFlow.refetch()}>
                Reintentar
              </button>
            </p>
          )}
          {cashFlow.data && (
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(['CASH', 'QR'] as const).map((method) => {
                const sales =
                  method === 'CASH' ? cashFlow.data.salesCashCents : cashFlow.data.salesQrCents
                const purchases =
                  method === 'CASH'
                    ? cashFlow.data.inventoryCashCents
                    : cashFlow.data.inventoryQrCents
                const operating =
                  method === 'CASH' ? cashFlow.data.expenseCashCents : cashFlow.data.expenseQrCents
                const net =
                  method === 'CASH' ? cashFlow.data.netCashCents : cashFlow.data.netQrCents
                return (
                  <dl key={method} className="rounded-2xl border border-lou-fog p-5">
                    <h3 className="font-display text-2xl font-bold">{paymentLabel(method)}</h3>
                    <div className="mt-4 flex justify-between gap-3 text-sm">
                      <dt>Ventas cobradas</dt>
                      <dd className="tabular-nums">{centsToBolivianos(sales)}</dd>
                    </div>
                    <div className="mt-2 flex justify-between gap-3 text-sm">
                      <dt>Compras de reventa</dt>
                      <dd className="tabular-nums">− {centsToBolivianos(purchases)}</dd>
                    </div>
                    <div className="mt-2 flex justify-between gap-3 text-sm">
                      <dt>Gastos operativos</dt>
                      <dd className="tabular-nums">− {centsToBolivianos(operating)}</dd>
                    </div>
                    <div className="mt-4 flex justify-between gap-3 border-t border-lou-fog pt-3 font-bold">
                      <dt>Neto {method === 'CASH' ? 'efectivo' : 'QR'}</dt>
                      <dd className="tabular-nums">{centsToBolivianos(net)}</dd>
                    </div>
                  </dl>
                )
              })}
            </div>
          )}
        </section>
      )}

      {panel && (
        <AgendaDialog
          label={
            {
              receipt: 'Registrar compra',
              adjustment: 'Ajustar inventario',
              expense: 'Registrar gasto',
              void: 'Anular gasto',
              movements: 'Historial de producto',
            }[panel]
          }
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                {panel === 'movements' ? 'Trazabilidad' : 'Operación con historial'}
              </p>
              <h2 className="font-display text-3xl font-bold">
                {
                  {
                    receipt: 'Registrar compra',
                    adjustment: 'Ajustar inventario',
                    expense: 'Registrar gasto',
                    void: 'Anular gasto',
                    movements: selectedProduct?.name ?? 'Historial',
                  }[panel]
                }
              </h2>
            </div>
            <Button
              variant="ghost"
              aria-label="Cerrar panel"
              disabled={busy}
              onClick={() => setPanel(null)}
            >
              <AppIcon name="close" />
            </Button>
          </div>

          {panel === 'receipt' && (
            <div className="mt-6 grid gap-4">
              <p className="text-sm text-lou-graphite/60">
                La compra incrementa el stock y registra su salida en caja. No la anotes otra vez
                como gasto.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClassName}>
                  Fecha
                  <input
                    className={fieldClassName}
                    type="date"
                    value={receiptDate}
                    onChange={(event) => setReceiptDate(event.target.value)}
                  />
                </label>
                <label className={labelClassName}>
                  Medio de pago
                  <select
                    className={fieldClassName}
                    value={receiptMethod}
                    onChange={(event) => setReceiptMethod(event.target.value as PaymentMethod)}
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="QR">QR</option>
                  </select>
                </label>
              </div>
              <h3 className="font-display text-xl font-bold">Productos recibidos</h3>
              {receiptRows.map((row, index) => (
                <div
                  className="grid gap-3 rounded-xl border border-lou-fog bg-lou-paper p-4"
                  key={index}
                >
                  <div className="flex justify-between gap-2">
                    <strong>Producto {index + 1}</strong>
                    {receiptRows.length > 1 && (
                      <Button
                        variant="ghost"
                        aria-label={`Quitar producto ${index + 1}`}
                        onClick={() =>
                          setReceiptRows((rows) => rows.filter((_, rowIndex) => rowIndex !== index))
                        }
                      >
                        Quitar
                      </Button>
                    )}
                  </div>
                  <label className={labelClassName}>
                    Producto
                    <select
                      className={fieldClassName}
                      value={row.productId}
                      onChange={(event) =>
                        updateReceiptRow(index, { productId: event.target.value })
                      }
                    >
                      <option value="">Selecciona un producto</option>
                      {activeProducts.map((item) => (
                        <option key={item.productId} value={item.productId}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className={labelClassName}>
                      Cantidad
                      <input
                        className={fieldClassName}
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={row.quantity}
                        onChange={(event) =>
                          updateReceiptRow(index, { quantity: event.target.value })
                        }
                      />
                    </label>
                    <label className={labelClassName}>
                      Costo unitario en Bs
                      <input
                        className={fieldClassName}
                        inputMode="decimal"
                        placeholder="Ej. 25,50"
                        value={row.unitCost}
                        onChange={(event) =>
                          updateReceiptRow(index, { unitCost: event.target.value })
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
              <Button
                variant="secondary"
                onClick={() =>
                  setReceiptRows((rows) => [...rows, { productId: '', quantity: '', unitCost: '' }])
                }
              >
                Agregar otro producto
              </Button>
              <div className="flex justify-between rounded-xl bg-lou-ink p-4 text-white">
                <strong>Total de compra</strong>
                <strong className="tabular-nums">{centsToBolivianos(receiptAmount)}</strong>
              </div>
              {receiptRows.length > 1 &&
                new Set(receiptRows.map((row) => row.productId).filter(Boolean)).size !==
                  receiptRows.filter((row) => row.productId).length && (
                  <p className={errorClassName}>
                    Un producto sólo puede aparecer una vez por compra.
                  </p>
                )}
              <Button
                disabled={!online || busy || !receiptIsValid || !receiptDate}
                onClick={() =>
                  void run(async () => {
                    await inventoryApi.receive({
                      receiptDate,
                      paymentMethod: receiptMethod,
                      items: parsedReceiptRows.map((row) => ({
                        productId: row.productId,
                        quantity: row.quantity,
                        unitCostCents: row.unitCostCents!,
                      })),
                    })
                    setReceiptRows([{ productId: '', quantity: '', unitCost: '' }])
                  }, 'Compra registrada.')
                }
              >
                {busy ? 'Guardando…' : `Confirmar compra de ${centsToBolivianos(receiptAmount)}`}
              </Button>
            </div>
          )}

          {panel === 'adjustment' && selectedProduct && (
            <div className="mt-6 grid gap-4">
              <p className="text-sm text-lou-graphite/60">
                {selectedProduct.name} · existencia actual{' '}
                <strong>{selectedProduct.quantity} unidades</strong>. Se añadirá un movimiento; no
                se modificará el historial anterior.
              </p>
              <label className={labelClassName}>
                Tipo de ajuste
                <select
                  className={fieldClassName}
                  value={adjustmentType}
                  onChange={(event) => setAdjustmentType(event.target.value as MovementType)}
                >
                  <option value="COUNT_ADJUSTMENT">Conteo físico</option>
                  <option value="DAMAGE">Daño o baja</option>
                  <option value="LOSS">Pérdida</option>
                  <option value="INTERNAL_USE">Uso interno</option>
                </select>
              </label>
              <label className={labelClassName}>
                Cambio de unidades
                <input
                  className={fieldClassName}
                  type="number"
                  inputMode="numeric"
                  step="1"
                  placeholder={adjustmentType === 'COUNT_ADJUSTMENT' ? 'Ej. -2 o 3' : 'Ej. -1'}
                  value={quantityDelta}
                  onChange={(event) => setQuantityDelta(event.target.value)}
                />
              </label>
              <p className="text-xs text-lou-graphite/55">
                {adjustmentType === 'COUNT_ADJUSTMENT'
                  ? 'Introduce la diferencia entre el conteo físico y la existencia actual.'
                  : 'Para una baja, usa un número negativo.'}
              </p>
              {quantityDelta.trim() !== '' && selectedProduct.quantity + adjustmentQuantity < 0 && (
                <p className={errorClassName}>El ajuste no puede dejar existencias negativas.</p>
              )}
              <label className={labelClassName}>
                Motivo
                <textarea
                  className={`${fieldClassName} min-h-24 py-3`}
                  maxLength={300}
                  value={adjustmentReason}
                  onChange={(event) => setAdjustmentReason(event.target.value)}
                />
              </label>
              <Button
                disabled={!online || busy || !adjustmentIsValid}
                onClick={() =>
                  void run(
                    () =>
                      inventoryApi.adjust(selectedProduct.productId, {
                        quantityDelta: adjustmentQuantity,
                        type: adjustmentType,
                        reason: adjustmentReason.trim(),
                      }),
                    'Movimiento de inventario registrado.',
                  )
                }
              >
                {busy ? 'Guardando…' : 'Registrar ajuste'}
              </Button>
            </div>
          )}

          {panel === 'movements' && selectedProduct && (
            <div className="mt-6 grid gap-2">
              <p className="mb-2 text-sm text-lou-graphite/60">
                Historial inmutable de entradas, salidas y correcciones de {selectedProduct.name}.
              </p>
              {movements.isPending && <p role="status">Cargando movimientos…</p>}
              {movements.isError && (
                <p className={errorClassName} role="alert">
                  No se pudieron cargar los movimientos.
                </p>
              )}
              {movements.data?.length === 0 && (
                <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
                  Todavía no hay movimientos.
                </p>
              )}
              {movements.data?.map((item) => (
                <article
                  key={item.id}
                  className="flex justify-between gap-4 rounded-xl border border-lou-fog p-4"
                >
                  <div>
                    <strong>{movementLabel(item.type)}</strong>
                    <p className="mt-1 text-xs text-lou-graphite/55">
                      {formatDateTime(item.occurredAt)}
                    </p>
                    {item.reason && (
                      <p className="mt-2 text-xs text-lou-graphite/70">{item.reason}</p>
                    )}
                  </div>
                  <strong className="shrink-0 font-display text-xl tabular-nums">
                    {item.quantityDelta > 0 ? '+' : ''}
                    {item.quantityDelta}
                  </strong>
                </article>
              ))}
            </div>
          )}

          {panel === 'expense' && (
            <div className="mt-6 grid gap-4">
              <p className="text-sm text-lou-graphite/60">
                Registra sólo un gasto operativo ya pagado. Las compras para reventa van en Compras.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClassName}>
                  Fecha
                  <input
                    className={fieldClassName}
                    type="date"
                    value={expense.expenseDate}
                    onChange={(event) =>
                      setExpense((value) => ({ ...value, expenseDate: event.target.value }))
                    }
                  />
                </label>
                <label className={labelClassName}>
                  Categoría
                  <select
                    className={fieldClassName}
                    value={expense.categoryId}
                    onChange={(event) =>
                      setExpense((value) => ({ ...value, categoryId: event.target.value }))
                    }
                  >
                    <option value="">Selecciona una categoría</option>
                    {configuration.data?.expenseCategories
                      .filter((item) => item.active)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              {configuration.isError && (
                <p className={errorClassName} role="alert">
                  No se pudieron cargar las categorías.{' '}
                  <button
                    className="font-bold underline"
                    onClick={() => void configuration.refetch()}
                  >
                    Reintentar
                  </button>
                </p>
              )}
              <label className={labelClassName}>
                Concepto
                <input
                  className={fieldClassName}
                  maxLength={300}
                  value={expense.description}
                  onChange={(event) =>
                    setExpense((value) => ({ ...value, description: event.target.value }))
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClassName}>
                  Importe en Bs
                  <input
                    className={fieldClassName}
                    inputMode="decimal"
                    placeholder="Ej. 45,00"
                    value={expense.amount}
                    onChange={(event) =>
                      setExpense((value) => ({ ...value, amount: event.target.value }))
                    }
                  />
                </label>
                <label className={labelClassName}>
                  Medio de pago
                  <select
                    className={fieldClassName}
                    value={expense.paymentMethod}
                    onChange={(event) =>
                      setExpense((value) => ({
                        ...value,
                        paymentMethod: event.target.value as PaymentMethod,
                      }))
                    }
                  >
                    <option value="CASH">Efectivo</option>
                    <option value="QR">QR</option>
                  </select>
                </label>
              </div>
              <Button
                disabled={
                  !online ||
                  busy ||
                  !expense.categoryId ||
                  !expense.description.trim() ||
                  !expense.expenseDate ||
                  expenseAmountCents === null ||
                  expenseAmountCents <= 0
                }
                onClick={() =>
                  void run(async () => {
                    await inventoryApi.createExpense({
                      categoryId: expense.categoryId,
                      expenseDate: expense.expenseDate,
                      description: expense.description.trim(),
                      amountCents: expenseAmountCents!,
                      paymentMethod: expense.paymentMethod,
                    })
                    setExpense({
                      categoryId: '',
                      expenseDate: today,
                      description: '',
                      amount: '',
                      paymentMethod: 'CASH',
                    })
                  }, 'Gasto registrado.')
                }
              >
                {busy ? 'Guardando…' : 'Registrar gasto pagado'}
              </Button>
            </div>
          )}

          {panel === 'void' && selectedExpense && (
            <div className="mt-6 grid gap-4">
              <p className="rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950">
                Anular no borra el gasto. Conserva el importe original, el motivo y la corrección de
                caja.
              </p>
              <p className="text-sm">
                <strong>{selectedExpense.description}</strong> ·{' '}
                {centsToBolivianos(selectedExpense.amountCents)}
              </p>
              <label className={labelClassName}>
                Motivo de anulación
                <textarea
                  className={`${fieldClassName} min-h-24 py-3`}
                  maxLength={300}
                  value={voidReason}
                  onChange={(event) => setVoidReason(event.target.value)}
                />
              </label>
              <Button
                variant="danger"
                disabled={!online || busy || !voidReason.trim()}
                onClick={() =>
                  void run(
                    () => inventoryApi.voidExpense(selectedExpense, voidReason.trim()),
                    'Gasto anulado con historial.',
                  )
                }
              >
                {busy ? 'Anulando…' : 'Confirmar anulación'}
              </Button>
            </div>
          )}
        </AgendaDialog>
      )}
    </main>
  )
}
