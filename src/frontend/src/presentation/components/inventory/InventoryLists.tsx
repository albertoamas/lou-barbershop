import { centsToBolivianos } from '../../../core/configuration/Configuration'
import type { CashFlow, Expense, Receipt } from '../../../core/inventory/Inventory'
import type { PaymentMethod } from '../../../core/sales/Sales'
import { cn } from '../../styles/cn'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'

const methodLabel = (method: PaymentMethod) => (method === 'CASH' ? 'efectivo' : 'QR')

const shortDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(/\./g, '')

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const ReceiptList = ({ receipts }: { receipts: Receipt[] }) =>
  receipts.length === 0 ? (
    <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
      Todavía no hay compras registradas.
    </p>
  ) : (
    <ul className="grid gap-2">
      {receipts.map((receipt) => (
        <li key={receipt.id}>
          <details className="group rounded-control bg-surface-muted">
            <summary className="flex min-h-16 cursor-pointer items-center justify-between gap-4 px-4 py-3">
              <span className="min-w-0">
                <span className="block font-semibold">{shortDate(receipt.receiptDate)}</span>
                <span className="block text-ink-soft">
                  {plural(receipt.items.length, 'producto', 'productos')}, pagado en{' '}
                  {methodLabel(receipt.paymentMethod)}
                  {receipt.status === 'REVERSED' ? ', revertida' : ''}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className={cn(
                    'font-display text-xl font-extrabold tabular-nums',
                    receipt.status === 'REVERSED' && 'line-through',
                  )}
                >
                  {centsToBolivianos(receipt.totalCents)}
                </span>
                <span className="transition-transform duration-150 group-open:rotate-180">
                  <AppIcon name="chevron-down" size={18} />
                </span>
              </span>
            </summary>
            <ul className="grid gap-2 border-t border-surface-strong px-4 py-3">
              {receipt.items.map((item) => (
                <li key={item.id} className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="block font-semibold">{item.productName}</span>
                    <span className="block text-sm text-ink-soft">
                      {plural(item.quantity, 'unidad', 'unidades')} a{' '}
                      {centsToBolivianos(item.unitCostCents)}
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {centsToBolivianos(item.lineTotalCents)}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
    </ul>
  )

export const ExpenseList = ({
  expenses,
  disabled,
  onVoid,
}: {
  expenses: Expense[]
  disabled: boolean
  onVoid: (expense: Expense) => void
}) =>
  expenses.length === 0 ? (
    <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
      Todavía no hay gastos registrados.
    </p>
  ) : (
    <ul className="grid gap-2">
      {expenses.map((expense) => {
        const voided = expense.status === 'VOIDED'
        return (
          <li
            key={expense.id}
            className="flex flex-wrap items-center gap-3 rounded-control bg-surface-muted px-4 py-3"
          >
            <span className="min-w-0 flex-1">
              <span className={cn('block font-semibold', voided && 'line-through')}>
                {expense.description}
              </span>
              <span className="block text-ink-soft">
                {shortDate(expense.expenseDate)}, {expense.categoryName}, pagado en{' '}
                {methodLabel(expense.paymentMethod)}
              </span>
              {voided && (
                <span className="block text-danger-ink">Anulado: {expense.voidReason}</span>
              )}
            </span>
            <span
              className={cn(
                'font-display text-xl font-extrabold tabular-nums',
                voided && 'text-ink-muted line-through',
              )}
            >
              {centsToBolivianos(expense.amountCents)}
            </span>
            {!voided && (
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                aria-label={`Anular ${expense.description}`}
                onClick={() => onVoid(expense)}
              >
                Anular
              </Button>
            )}
          </li>
        )
      })}
    </ul>
  )

const Row = ({ label, value, out = false }: { label: string; value: number; out?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3">
    <dt className="text-ink-soft">{label}</dt>
    <dd className={cn('font-semibold tabular-nums', out && value > 0 && 'text-danger-ink')}>
      {out && value > 0 ? `menos ${centsToBolivianos(value)}` : centsToBolivianos(value)}
    </dd>
  </div>
)

// What came in and went out of the till today, by payment method.
export const CashToday = ({ cash }: { cash: CashFlow }) => (
  <div className="grid gap-3 sm:grid-cols-2">
    {(
      [
        [
          'Efectivo',
          cash.salesCashCents,
          cash.inventoryCashCents,
          cash.expenseCashCents,
          cash.netCashCents,
        ],
        ['QR', cash.salesQrCents, cash.inventoryQrCents, cash.expenseQrCents, cash.netQrCents],
      ] as const
    ).map(([label, sales, purchases, expenses, net]) => (
      <section key={label} className="rounded-panel bg-surface-muted p-5" aria-label={label}>
        <h3 className="flex items-center gap-2 font-display text-2xl font-extrabold">
          <AppIcon name={label === 'Efectivo' ? 'cash' : 'qr'} size={22} />
          {label}
        </h3>
        <dl className="mt-4 grid gap-2">
          <Row label="Entró por ventas" value={sales} />
          <Row label="Salió por compras" value={purchases} out />
          <Row label="Salió por gastos" value={expenses} out />
          <div
            className={cn(
              'mt-2 flex items-baseline justify-between gap-3 rounded-control p-3',
              net >= 0 ? 'bg-success-soft text-success-ink' : 'bg-danger-soft text-danger-ink',
            )}
          >
            <dt className="font-semibold">Queda</dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">
              {centsToBolivianos(net)}
            </dd>
          </div>
        </dl>
      </section>
    ))}
  </div>
)
