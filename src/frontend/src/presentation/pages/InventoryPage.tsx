import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { receiptTotal, type MovementType } from '../../core/inventory/Inventory'
import type { PaymentMethod } from '../../core/sales/Sales'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { useConnectivity } from '../hooks/useConnectivity'

type InventoryTab = 'stock' | 'purchases' | 'expenses' | 'cash'

export const InventoryPage = () => {
  const today = todayInBusinessTime()
  const online = useConnectivity() === 'online'
  const [receiptDate, setReceiptDate] = useState(today)
  const [receiptMethod, setReceiptMethod] = useState<PaymentMethod>('CASH')
  const [receiptRows, setReceiptRows] = useState<
    Record<string, { quantity: number; unitCostCents: number }>
  >({})
  const [expense, setExpense] = useState({
    categoryId: '',
    expenseDate: today,
    description: '',
    amountCents: 0,
    paymentMethod: 'CASH' as PaymentMethod,
  })
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [activeTab, setActiveTab] = useState<InventoryTab>('stock')
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: inventoryApi.inventory })
  const receipts = useQuery({ queryKey: ['inventory', 'receipts'], queryFn: inventoryApi.receipts })
  const expenses = useQuery({ queryKey: ['expenses'], queryFn: inventoryApi.expenses })
  const configuration = useQuery({ queryKey: ['configuration'], queryFn: configurationApi.load })
  const cashFlow = useQuery({
    queryKey: ['cash-flow', today],
    queryFn: () => inventoryApi.cashFlow(today, today),
  })
  const selectedRows = useMemo(
    () =>
      Object.entries(receiptRows)
        .filter(([, row]) => row.quantity > 0 && row.unitCostCents > 0)
        .map(([productId, row]) => ({ productId, ...row })),
    [receiptRows],
  )
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
      setNotice(message)
      await refresh()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }
  const adjust = (productId: string, type: MovementType) => {
    const amount = Number(window.prompt('Cantidad con signo (ej. -1 o 3)'))
    const reason = window.prompt('Motivo del ajuste')?.trim()
    if (!Number.isInteger(amount) || amount === 0 || !reason) return
    void run(
      () => inventoryApi.adjust(productId, { quantityDelta: amount, type, reason }),
      'Ajuste registrado.',
    )
  }
  return (
    <main className="content operations-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Inventario y caja</p>
          <h1>Productos, compras y gastos sin mezclar conceptos.</h1>
          <p>
            Las existencias nacen de movimientos; las compras de reventa salen de caja, pero no se
            duplican como gasto.
          </p>
        </div>
      </div>
      {!online && (
        <p role="status" className="conflict-notice">
          Sin conexión: inventario, compras y gastos son operaciones críticas y no se pueden
          modificar.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <div className="report-tabs" role="tablist" aria-label="Secciones de inventario y caja">
        {(
          [
            ['stock', 'Existencias'],
            ['purchases', 'Compras'],
            ['expenses', 'Gastos'],
            ['cash', 'Caja de hoy'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {activeTab === 'stock' && (
        <section className="master-panel">
          <h2>Existencias</h2>
          {inventory.data?.map((item) => (
            <article className="appointment-card" key={item.productId}>
              <strong>{item.name}</strong>
              <span>
                {item.quantity} unidades · mínimo {item.minimumStock} · venta{' '}
                {centsToBolivianos(item.salePriceCents)}
              </span>
              <small>
                {item.lowStock ? 'Existencia baja' : 'Existencia suficiente'}
                {item.averageCostCents !== undefined
                  ? ` · costo promedio ${centsToBolivianos(item.averageCostCents)}`
                  : ''}
              </small>
              <div>
                <button
                  disabled={!online || busy}
                  onClick={() => adjust(item.productId, 'COUNT_ADJUSTMENT')}
                >
                  Conteo
                </button>{' '}
                <button disabled={!online || busy} onClick={() => adjust(item.productId, 'DAMAGE')}>
                  Daño/baja
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      {activeTab === 'purchases' && (
        <section className="master-panel">
          <h2>Registrar compra de reventa</h2>
          <div className="compact-form">
            <label>
              Fecha
              <input
                type="date"
                value={receiptDate}
                onChange={(e) => setReceiptDate(e.target.value)}
              />
            </label>
            <label>
              Medio
              <select
                value={receiptMethod}
                onChange={(e) => setReceiptMethod(e.target.value as PaymentMethod)}
              >
                <option value="CASH">Efectivo</option>
                <option value="QR">QR</option>
              </select>
            </label>
          </div>
          {inventory.data
            ?.filter((x) => x.active)
            .map((item) => (
              <div className="compact-form" key={item.productId}>
                <strong>{item.name}</strong>
                <label>
                  Cantidad
                  <input
                    type="number"
                    min="0"
                    value={receiptRows[item.productId]?.quantity ?? 0}
                    onChange={(e) =>
                      setReceiptRows((rows) => ({
                        ...rows,
                        [item.productId]: {
                          quantity: Number(e.target.value),
                          unitCostCents: rows[item.productId]?.unitCostCents ?? 0,
                        },
                      }))
                    }
                  />
                </label>
                <label>
                  Costo unitario (centavos)
                  <input
                    type="number"
                    min="0"
                    value={receiptRows[item.productId]?.unitCostCents ?? 0}
                    onChange={(e) =>
                      setReceiptRows((rows) => ({
                        ...rows,
                        [item.productId]: {
                          quantity: rows[item.productId]?.quantity ?? 0,
                          unitCostCents: Number(e.target.value),
                        },
                      }))
                    }
                  />
                </label>
              </div>
            ))}
          <p>
            Total: <strong>{centsToBolivianos(receiptTotal(selectedRows))}</strong>
          </p>
          <button
            className="primary-button"
            disabled={!online || busy || selectedRows.length === 0}
            onClick={() =>
              void run(async () => {
                await inventoryApi.receive({
                  receiptDate,
                  paymentMethod: receiptMethod,
                  items: selectedRows,
                })
                setReceiptRows({})
              }, 'Compra registrada.')
            }
          >
            Confirmar compra
          </button>
          <h3>Historial</h3>
          {receipts.data?.map((receipt) => (
            <p key={receipt.id}>
              {receipt.receiptDate} ·{' '}
              {receipt.items.map((x) => `${x.productName} × ${x.quantity}`).join(', ')} ·{' '}
              {centsToBolivianos(receipt.totalCents)} · {receipt.paymentMethod}
            </p>
          ))}
        </section>
      )}
      {activeTab === 'expenses' && (
        <section className="master-panel">
          <h2>Gastos operativos pagados</h2>
          <div className="compact-form">
            <label>
              Fecha
              <input
                type="date"
                value={expense.expenseDate}
                onChange={(e) => setExpense({ ...expense, expenseDate: e.target.value })}
              />
            </label>
            <label>
              Categoría
              <select
                value={expense.categoryId}
                onChange={(e) => setExpense({ ...expense, categoryId: e.target.value })}
              >
                <option value="">Selecciona</option>
                {configuration.data?.expenseCategories
                  .filter((x) => x.active)
                  .map((x) => (
                    <option value={x.id} key={x.id}>
                      {x.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Concepto
              <input
                value={expense.description}
                onChange={(e) => setExpense({ ...expense, description: e.target.value })}
              />
            </label>
            <label>
              Monto (centavos)
              <input
                type="number"
                min="1"
                value={expense.amountCents}
                onChange={(e) => setExpense({ ...expense, amountCents: Number(e.target.value) })}
              />
            </label>
            <label>
              Medio
              <select
                value={expense.paymentMethod}
                onChange={(e) =>
                  setExpense({ ...expense, paymentMethod: e.target.value as PaymentMethod })
                }
              >
                <option value="CASH">Efectivo</option>
                <option value="QR">QR</option>
              </select>
            </label>
            <button
              disabled={
                !online ||
                busy ||
                !expense.categoryId ||
                !expense.description.trim() ||
                expense.amountCents <= 0
              }
              onClick={() =>
                void run(async () => {
                  await inventoryApi.createExpense(expense)
                  setExpense({
                    categoryId: '',
                    expenseDate: today,
                    description: '',
                    amountCents: 0,
                    paymentMethod: 'CASH',
                  })
                }, 'Gasto registrado.')
              }
            >
              Registrar gasto pagado
            </button>
          </div>
          {expenses.data?.map((row) => (
            <p key={row.id}>
              {row.expenseDate} · {row.categoryName} · {row.description} ·{' '}
              {centsToBolivianos(row.amountCents)} · {row.status}
              {row.status === 'RECORDED' && (
                <button
                  disabled={!online || busy}
                  onClick={() => {
                    const reason = window.prompt('Motivo de anulación')?.trim()
                    if (reason)
                      void run(
                        () => inventoryApi.voidExpense(row, reason),
                        'Gasto anulado con auditoría.',
                      )
                  }}
                >
                  Anular
                </button>
              )}
            </p>
          ))}
        </section>
      )}
      {activeTab === 'cash' && (
        <section className="master-panel">
          <h2>Flujo de caja de hoy</h2>
          {cashFlow.data && (
            <>
              <p>
                Ventas: efectivo {centsToBolivianos(cashFlow.data.salesCashCents)} · QR{' '}
                {centsToBolivianos(cashFlow.data.salesQrCents)}
              </p>
              <p>
                Compras de inventario:{' '}
                {centsToBolivianos(
                  cashFlow.data.inventoryCashCents + cashFlow.data.inventoryQrCents,
                )}{' '}
                · gastos:{' '}
                {centsToBolivianos(cashFlow.data.expenseCashCents + cashFlow.data.expenseQrCents)}
              </p>
              <p>
                <strong>
                  Neto efectivo {centsToBolivianos(cashFlow.data.netCashCents)} · neto QR{' '}
                  {centsToBolivianos(cashFlow.data.netQrCents)}
                </strong>
              </p>
            </>
          )}
        </section>
      )}
    </main>
  )
}
