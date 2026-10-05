import { useCallback, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { stockStatus, type Expense, type InventoryItem } from '../../core/inventory/Inventory'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { Toast } from '../components/Toast'
import {
  AdjustmentForm,
  ExpenseForm,
  ProductSheet,
  PurchaseForm,
  VoidExpenseForm,
} from '../components/inventory/InventoryForms'
import { CashToday, ExpenseList, ReceiptList } from '../components/inventory/InventoryLists'
import { StockList } from '../components/inventory/StockList'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

type Tab = 'products' | 'purchases' | 'expenses' | 'cash'
type Panel =
  | { type: 'product'; item: InventoryItem }
  | { type: 'purchase'; productId?: string | undefined }
  | { type: 'adjust'; item: InventoryItem }
  | { type: 'expense' }
  | { type: 'void'; expense: Expense }
  | null

const panelLabel = (panel: NonNullable<Panel>) =>
  ({
    product: 'Ficha del producto',
    purchase: 'Registrar compra',
    adjust: 'Corregir stock',
    expense: 'Registrar gasto',
    void: 'Anular gasto',
  })[panel.type]

const Loading = ({ label }: { label: string }) => (
  <div
    className="h-48 animate-pulse rounded-control bg-surface-muted"
    role="status"
    aria-label={label}
  />
)

const Failed = ({ text, onRetry }: { text: string; onRetry: () => void }) => (
  <div
    className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
    role="alert"
  >
    {text}
    <Button variant="secondary" size="sm" onClick={onRetry}>
      Reintentar
    </Button>
  </div>
)

export const InventoryPage = () => {
  const today = todayInBusinessTime()
  const online = useConnectivity() === 'online'
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const [tab, setTab] = useState<Tab>('products')
  const [panel, setPanel] = useState<Panel>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])
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
  const productId = panel?.type === 'product' ? panel.item.productId : undefined
  const movements = useQuery({
    queryKey: ['inventory', 'movements', productId],
    queryFn: () => inventoryApi.movements(productId ?? ''),
    enabled: canManage && Boolean(productId),
  })

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true)
    setError('')
    try {
      await action()
      await Promise.all([
        inventory.refetch(),
        receipts.refetch(),
        expenses.refetch(),
        cashFlow.refetch(),
      ])
      setPanel(null)
      setNotice(message)
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  if (session.isPending)
    return (
      <main
        className="mx-auto w-full max-w-360 px-4 py-6"
        role="status"
        aria-label="Cargando inventario"
      >
        <div className="h-96 animate-pulse rounded-panel bg-surface-strong" />
      </main>
    )
  if (!canManage) return <Navigate to="/app/acceso-denegado" replace />

  const items = inventory.data ?? []
  const activeProducts = items.filter((item) => item.active)
  const lowCount = items.filter((item) => ['LOW', 'OUT'].includes(stockStatus(item))).length
  const netToday = cashFlow.data ? cashFlow.data.netCashCents + cashFlow.data.netQrCents : undefined
  const disabled = !online || busy
  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'products', label: 'Productos', ...(lowCount > 0 ? { badge: lowCount } : {}) },
    { id: 'purchases', label: 'Compras' },
    { id: 'expenses', label: 'Gastos' },
    { id: 'cash', label: 'Caja de hoy' },
  ]

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            Inventario y gastos
          </h1>
          <p className="mt-2 text-lg text-pretty text-ink-soft">
            {inventory.data &&
              (lowCount > 0
                ? `${lowCount} ${lowCount === 1 ? 'producto necesita' : 'productos necesitan'} reposición.`
                : 'Todo el stock está en orden.')}
            {netToday !== undefined && ` Caja de hoy: ${centsToBolivianos(netToday)}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 max-sm:w-full">
          <Button
            className="max-sm:flex-1"
            disabled={disabled || activeProducts.length === 0}
            onClick={() => setPanel({ type: 'purchase' })}
          >
            <AppIcon name="plus" size={20} />
            <span className="sm:hidden">Compra</span>
            <span className="max-sm:hidden">Registrar compra</span>
          </Button>
          <Button
            variant="secondary"
            className="max-sm:flex-1"
            disabled={disabled}
            onClick={() => setPanel({ type: 'expense' })}
          >
            <AppIcon name="plus" size={20} />
            <span className="sm:hidden">Gasto</span>
            <span className="max-sm:hidden">Registrar gasto</span>
          </Button>
        </div>
      </header>

      {!online && (
        <p className={cn(warningClassName, 'mt-4')} role="status">
          Sin conexión. Puedes consultar, pero no registrar compras, gastos ni correcciones.
        </p>
      )}
      {error && !panel && (
        <p className={cn(errorClassName, 'mt-4')} role="alert">
          {error}
        </p>
      )}

      <div
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        role="tablist"
        aria-label="Secciones"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`inventory-tab-${item.id}`}
            aria-controls={`inventory-panel-${item.id}`}
            aria-selected={tab === item.id}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors duration-150',
              tab === item.id
                ? 'border-ink bg-ink text-on-ink'
                : 'border-transparent bg-surface shadow-raised hover:border-line-control',
            )}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.badge !== undefined && (
              <span className="rounded-full bg-warning-soft px-2 text-sm text-warning-ink tabular-nums">
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <section
        id={`inventory-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`inventory-tab-${tab}`}
        className="mt-4 rounded-panel bg-surface p-5 shadow-raised sm:p-6"
      >
        {tab === 'products' &&
          (inventory.isPending ? (
            <Loading label="Cargando productos" />
          ) : inventory.isError ? (
            <Failed
              text="No pudimos cargar los productos."
              onRetry={() => void inventory.refetch()}
            />
          ) : (
            <StockList
              items={items}
              disabled={disabled}
              onOpen={(item) => setPanel({ type: 'product', item })}
              onRestock={(item) => setPanel({ type: 'purchase', productId: item.productId })}
            />
          ))}
        {tab === 'purchases' &&
          (receipts.isPending ? (
            <Loading label="Cargando compras" />
          ) : receipts.isError ? (
            <Failed text="No pudimos cargar las compras." onRetry={() => void receipts.refetch()} />
          ) : (
            <ReceiptList receipts={receipts.data} />
          ))}
        {tab === 'expenses' &&
          (expenses.isPending ? (
            <Loading label="Cargando gastos" />
          ) : expenses.isError ? (
            <Failed text="No pudimos cargar los gastos." onRetry={() => void expenses.refetch()} />
          ) : (
            <ExpenseList
              expenses={expenses.data}
              disabled={disabled}
              onVoid={(expense) => setPanel({ type: 'void', expense })}
            />
          ))}
        {tab === 'cash' &&
          (cashFlow.isPending ? (
            <Loading label="Cargando caja" />
          ) : cashFlow.isError ? (
            <Failed text="No pudimos cargar la caja." onRetry={() => void cashFlow.refetch()} />
          ) : (
            <CashToday cash={cashFlow.data} />
          ))}
      </section>

      {panel && (
        <AgendaDialog label={panelLabel(panel)} onClose={() => !busy && setPanel(null)}>
          {error && (
            <p className={cn(errorClassName, 'mb-4')} role="alert">
              {error}
            </p>
          )}
          {panel.type === 'product' && (
            <ProductSheet
              product={panel.item}
              movements={movements.data}
              movementsState={movements.status}
              disabled={disabled}
              onClose={() => setPanel(null)}
              onRestock={() => setPanel({ type: 'purchase', productId: panel.item.productId })}
              onAdjust={() => setPanel({ type: 'adjust', item: panel.item })}
            />
          )}
          {panel.type === 'purchase' && (
            <PurchaseForm
              products={activeProducts}
              initialProductId={panel.productId}
              today={today}
              busy={busy}
              online={online}
              onClose={() => setPanel(null)}
              onSave={(input) => void run(() => inventoryApi.receive(input), 'Compra registrada')}
            />
          )}
          {panel.type === 'adjust' && (
            <AdjustmentForm
              product={panel.item}
              busy={busy}
              online={online}
              onClose={() => setPanel(null)}
              onSave={(input) =>
                void run(() => inventoryApi.adjust(panel.item.productId, input), 'Stock corregido')
              }
            />
          )}
          {panel.type === 'expense' && (
            <ExpenseForm
              categories={configuration.data?.expenseCategories.filter((item) => item.active) ?? []}
              today={today}
              busy={busy}
              online={online}
              onClose={() => setPanel(null)}
              onSave={(input) =>
                void run(() => inventoryApi.createExpense(input), 'Gasto registrado')
              }
            />
          )}
          {panel.type === 'void' && (
            <VoidExpenseForm
              expense={panel.expense}
              busy={busy}
              online={online}
              onClose={() => setPanel(null)}
              onSave={(reason) =>
                void run(() => inventoryApi.voidExpense(panel.expense, reason), 'Gasto anulado')
              }
            />
          )}
        </AgendaDialog>
      )}
      <Toast message={notice} onDone={clearNotice} />
    </main>
  )
}
