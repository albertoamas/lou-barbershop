import { useState, type ReactNode } from 'react'
import { bolivianosToCents, centsToBolivianos } from '../../../core/configuration/Configuration'
import {
  adjustmentDelta,
  movementLabel,
  receiptTotal,
  stockStatus,
  stockStatusLabel,
  type AdjustmentKind,
  type Expense,
  type InventoryItem,
  type InventoryMovement,
} from '../../../core/inventory/Inventory'
import type { PaymentMethod } from '../../../core/sales/Sales'
import { cn } from '../../styles/cn'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  warningClassName,
} from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { QuantityStepper } from '../operations/QuantityStepper'

const choiceClassName = (active: boolean) =>
  cn(
    'min-h-12 rounded-control border-2 px-3 font-semibold transition-colors duration-150',
    active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:border-line-control',
  )

export const FormHeader = ({
  title,
  onClose,
  busy,
}: {
  title: string
  onClose: () => void
  busy: boolean
}) => (
  <div className="mb-6 flex items-start justify-between gap-3">
    <h2 className="font-display text-3xl font-extrabold text-balance">{title}</h2>
    <Button
      type="button"
      variant="ghost"
      className="w-12 shrink-0 px-0"
      aria-label="Cerrar"
      disabled={busy}
      onClick={onClose}
    >
      <AppIcon name="close" size={22} />
    </Button>
  </div>
)

const MethodToggle = ({
  value,
  onChange,
}: {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}) => (
  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Medio de pago">
    {(
      [
        ['CASH', 'Efectivo', 'cash'],
        ['QR', 'QR', 'qr'],
      ] as const
    ).map(([method, label, icon]) => (
      <button
        key={method}
        type="button"
        role="radio"
        aria-checked={value === method}
        className={cn(
          choiceClassName(value === method),
          'inline-flex items-center justify-center gap-2',
        )}
        onClick={() => onChange(method)}
      >
        <AppIcon name={icon} size={20} />
        {label}
      </button>
    ))}
  </div>
)

const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className={labelClassName}>
    {label}
    {children}
  </label>
)

type PurchaseRow = { key: number; productId: string; quantity: number; unitCost: string }

export interface PurchaseInput {
  receiptDate: string
  paymentMethod: PaymentMethod
  items: { productId: string; quantity: number; unitCostCents: number }[]
}

// Stock received for resale: it raises stock and is paid from the till, never again as
// an operating expense.
export const PurchaseForm = ({
  products,
  initialProductId,
  today,
  busy,
  online,
  onClose,
  onSave,
}: {
  products: InventoryItem[]
  initialProductId?: string | undefined
  today: string
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (input: PurchaseInput) => void
}) => {
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [rows, setRows] = useState<PurchaseRow[]>([
    { key: 0, productId: initialProductId ?? '', quantity: 1, unitCost: '' },
  ])
  const update = (key: number, patch: Partial<PurchaseRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  const parsed = rows.map((row) => ({ ...row, unitCostCents: bolivianosToCents(row.unitCost) }))
  const duplicated =
    new Set(rows.map((row) => row.productId).filter(Boolean)).size !==
    rows.filter((row) => row.productId).length
  const valid =
    !duplicated &&
    parsed.every(
      (row) =>
        row.productId && row.quantity > 0 && row.unitCostCents !== null && row.unitCostCents > 0,
    )
  const total = valid
    ? receiptTotal(
        parsed.map((row) => ({ quantity: row.quantity, unitCostCents: row.unitCostCents ?? 0 })),
      )
    : 0

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid)
          onSave({
            receiptDate: date,
            paymentMethod: method,
            items: parsed.map((row) => ({
              productId: row.productId,
              quantity: row.quantity,
              unitCostCents: row.unitCostCents ?? 0,
            })),
          })
      }}
    >
      <FormHeader title="Registrar compra" onClose={onClose} busy={busy} />
      <p className="-mt-3 text-ink-soft">
        Suma al stock y sale de caja. No la anotes otra vez como gasto.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha">
          <input
            className={fieldClassName}
            type="date"
            name="receipt-date"
            value={date}
            max={today}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-semibold text-ink-soft">Se pagó con</legend>
          <MethodToggle value={method} onChange={setMethod} />
        </fieldset>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 font-display text-xl font-extrabold">Productos recibidos</legend>
        {rows.map((row, index) => {
          const product = products.find((item) => item.productId === row.productId)
          const cents = bolivianosToCents(row.unitCost)
          return (
            <div key={row.key} className="grid gap-3 rounded-control bg-surface-muted p-4">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <Field label={`Producto ${index + 1}`}>
                    <select
                      className={fieldClassName}
                      name={`product-${index}`}
                      value={row.productId}
                      onChange={(event) => update(row.key, { productId: event.target.value })}
                    >
                      <option value="">Elige un producto</option>
                      {products.map((item) => (
                        <option key={item.productId} value={item.productId}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-12 shrink-0 px-0"
                    aria-label={`Quitar producto ${index + 1}`}
                    onClick={() =>
                      setRows((current) => current.filter((item) => item.key !== row.key))
                    }
                  >
                    <AppIcon name="close" size={20} />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="grid gap-2">
                  <span className="text-sm font-semibold text-ink-soft">Cantidad</span>
                  <QuantityStepper
                    name={product?.name ?? `producto ${index + 1}`}
                    value={row.quantity}
                    max={9999}
                    onChange={(value) => update(row.key, { quantity: value })}
                  />
                </div>
                <div className="w-40">
                  <Field label="Costo por unidad, Bs">
                    <input
                      className={fieldClassName}
                      name={`unit-cost-${index}`}
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      value={row.unitCost}
                      onChange={(event) => update(row.key, { unitCost: event.target.value })}
                    />
                  </Field>
                </div>
                <span className="ml-auto font-display text-xl font-extrabold tabular-nums">
                  {cents ? centsToBolivianos(cents * row.quantity) : ''}
                </span>
              </div>
            </div>
          )
        })}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setRows((current) => [
              ...current,
              { key: Date.now(), productId: '', quantity: 1, unitCost: '' },
            ])
          }
        >
          <AppIcon name="plus" size={18} />
          Agregar otro producto
        </Button>
        {duplicated && (
          <p className={errorClassName} role="alert">
            Cada producto va una sola vez por compra.
          </p>
        )}
      </fieldset>

      <div className="sticky bottom-0 -mx-5 -mb-5 grid gap-2 border-t border-surface-strong bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7">
        <p className="flex items-baseline justify-between font-semibold">
          Total de la compra
          <span className="font-display text-3xl font-extrabold tabular-nums">
            {centsToBolivianos(total)}
          </span>
        </p>
        <Button type="submit" size="lg" width="full" disabled={!online || busy || !valid}>
          {busy ? 'Guardando' : 'Confirmar compra'}
        </Button>
      </div>
    </form>
  )
}

const adjustmentKinds: { kind: AdjustmentKind; label: string }[] = [
  { kind: 'COUNT_ADJUSTMENT', label: 'Conteo' },
  { kind: 'DAMAGE', label: 'Daño' },
  { kind: 'LOSS', label: 'Pérdida' },
  { kind: 'INTERNAL_USE', label: 'Uso interno' },
]

const unitsText = (units: number) => `${units} ${units === 1 ? 'unidad' : 'unidades'}`

// A product's sheet: its state, what to do with it and its movement history.
export const ProductSheet = ({
  product,
  movements,
  movementsState,
  disabled,
  onRestock,
  onAdjust,
  onClose,
}: {
  product: InventoryItem
  movements: InventoryMovement[] | undefined
  movementsState: 'pending' | 'error' | 'success'
  disabled: boolean
  onRestock: () => void
  onAdjust: () => void
  onClose: () => void
}) => {
  const status = stockStatus(product)
  return (
    <div className="grid gap-6">
      <FormHeader title={product.name} onClose={onClose} busy={false} />
      <dl className="-mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-control bg-surface-muted p-3">
          <dt className="text-sm text-ink-soft">Hay</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">{product.quantity}</dd>
        </div>
        <div className="rounded-control bg-surface-muted p-3">
          <dt className="text-sm text-ink-soft">Mínimo</dt>
          <dd className="font-display text-3xl font-extrabold tabular-nums">
            {product.minimumStock}
          </dd>
        </div>
        <div className="rounded-control bg-surface-muted p-3">
          <dt className="text-sm text-ink-soft">Estado</dt>
          <dd className="font-semibold">{stockStatusLabel[status]}</dd>
        </div>
      </dl>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button disabled={disabled || !product.active} onClick={onRestock}>
          Reponer
        </Button>
        <Button variant="secondary" disabled={disabled || !product.active} onClick={onAdjust}>
          Corregir stock
        </Button>
      </div>
      <section aria-labelledby="movements-title">
        <h3 id="movements-title" className="mb-3 font-display text-xl font-extrabold">
          Movimientos
        </h3>
        {movementsState === 'pending' && (
          <div
            className="h-32 animate-pulse rounded-control bg-surface-muted"
            role="status"
            aria-label="Cargando movimientos"
          />
        )}
        {movementsState === 'error' && (
          <p className={errorClassName} role="alert">
            No pudimos cargar los movimientos.
          </p>
        )}
        {movements?.length === 0 && (
          <p className="rounded-control bg-surface-muted p-4 text-ink-soft">
            Todavía no hay movimientos.
          </p>
        )}
        <ul className="divide-y divide-surface-strong">
          {movements?.map((movement) => (
            <li key={movement.id} className="flex items-start justify-between gap-4 py-3">
              <span className="min-w-0">
                <span className="block font-semibold">{movementLabel(movement.type)}</span>
                <span className="block text-sm text-ink-soft">
                  {new Intl.DateTimeFormat('es-BO', {
                    timeZone: 'America/La_Paz',
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                    hourCycle: 'h23',
                  }).format(new Date(movement.occurredAt))}
                </span>
                {movement.reason && (
                  <span className="block text-sm text-ink-soft">{movement.reason}</span>
                )}
              </span>
              <span
                className={cn(
                  'shrink-0 font-display text-xl font-extrabold tabular-nums',
                  movement.quantityDelta > 0 ? 'text-success-ink' : 'text-danger-ink',
                )}
              >
                {movement.quantityDelta > 0 ? `+${movement.quantityDelta}` : movement.quantityDelta}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

export const AdjustmentForm = ({
  product,
  busy,
  online,
  onClose,
  onSave,
}: {
  product: InventoryItem
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (input: { quantityDelta: number; type: AdjustmentKind; reason: string }) => void
}) => {
  const [kind, setKind] = useState<AdjustmentKind>('COUNT_ADJUSTMENT')
  const [typed, setTyped] = useState('')
  const [reason, setReason] = useState('')
  const delta = adjustmentDelta(kind, product.quantity, typed)
  const negative = delta !== undefined && product.quantity + delta < 0
  const valid = delta !== undefined && delta !== 0 && !negative && reason.trim().length > 0
  const counting = kind === 'COUNT_ADJUSTMENT'

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid && delta !== undefined)
          onSave({ quantityDelta: delta, type: kind, reason: reason.trim() })
      }}
    >
      <FormHeader title={`Corregir stock de ${product.name}`} onClose={onClose} busy={busy} />
      <p className="-mt-3 text-ink-soft">
        Hoy figuran {unitsText(product.quantity)}. Se agrega un movimiento; el historial no se toca.
      </p>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-soft">Qué pasó</legend>
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="radiogroup"
          aria-label="Qué pasó"
        >
          {adjustmentKinds.map((item) => (
            <button
              key={item.kind}
              type="button"
              role="radio"
              aria-checked={kind === item.kind}
              className={choiceClassName(kind === item.kind)}
              onClick={() => {
                setKind(item.kind)
                setTyped('')
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label={counting ? '¿Cuántas hay ahora?' : '¿Cuántas salen?'}>
        <input
          className={cn(fieldClassName, 'font-display text-2xl font-extrabold tabular-nums')}
          name="units"
          inputMode="numeric"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
      </Field>
      {typed.trim() !== '' && delta === undefined && (
        <p className={warningClassName}>
          Escribe un número entero{counting ? '' : ' mayor que cero'}.
        </p>
      )}
      {delta !== undefined && delta !== 0 && !negative && (
        <p className="rounded-control bg-surface-muted p-4 font-semibold">
          {delta > 0 ? `Se suman ${unitsText(delta)}` : `Se restan ${unitsText(-delta)}`}. Quedarán{' '}
          {product.quantity + delta}.
        </p>
      )}
      {delta === 0 && (
        <p className="rounded-control bg-surface-muted p-4">
          El conteo coincide; no hace falta corregir.
        </p>
      )}
      {negative && (
        <p className={errorClassName} role="alert">
          No pueden salir más unidades de las que hay.
        </p>
      )}
      <Field label="Motivo">
        <input
          className={fieldClassName}
          name="reason"
          maxLength={300}
          placeholder="Por ejemplo, conteo del lunes"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <Button type="submit" size="lg" width="full" disabled={!online || busy || !valid}>
        {busy ? 'Guardando' : 'Guardar corrección'}
      </Button>
    </form>
  )
}

export interface ExpenseInput {
  categoryId: string
  expenseDate: string
  description: string
  amountCents: number
  paymentMethod: PaymentMethod
}

export const ExpenseForm = ({
  categories,
  today,
  busy,
  online,
  onClose,
  onSave,
}: {
  categories: { id: string; name: string }[]
  today: string
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (input: ExpenseInput) => void
}) => {
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(today)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const cents = bolivianosToCents(amount)
  const valid = Boolean(categoryId) && description.trim().length > 0 && cents !== null && cents > 0

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (valid && cents !== null)
          onSave({
            categoryId,
            expenseDate: date,
            description: description.trim(),
            amountCents: cents,
            paymentMethod: method,
          })
      }}
    >
      <FormHeader title="Registrar gasto" onClose={onClose} busy={busy} />
      <p className="-mt-3 text-ink-soft">
        Solo gastos ya pagados. Lo que compras para vender va en Compras.
      </p>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-soft">Categoría</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              role="radio"
              aria-checked={categoryId === category.id}
              className={cn(choiceClassName(categoryId === category.id), 'rounded-full px-4')}
              onClick={() => setCategoryId(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Concepto">
        <input
          className={fieldClassName}
          name="description"
          maxLength={300}
          placeholder="Por ejemplo, luz de septiembre"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Importe, Bs">
          <input
            className={cn(fieldClassName, 'font-display text-2xl font-extrabold tabular-nums')}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
        <Field label="Fecha">
          <input
            className={fieldClassName}
            type="date"
            name="expense-date"
            max={today}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            required
          />
        </Field>
      </div>
      {amount.trim() !== '' && cents === null && (
        <p className={warningClassName}>Escribe el importe como 45 o 45,50.</p>
      )}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink-soft">Se pagó con</legend>
        <MethodToggle value={method} onChange={setMethod} />
      </fieldset>
      <Button type="submit" size="lg" width="full" disabled={!online || busy || !valid}>
        {busy
          ? 'Guardando'
          : cents
            ? `Registrar gasto de ${centsToBolivianos(cents)}`
            : 'Registrar gasto'}
      </Button>
    </form>
  )
}

export const VoidExpenseForm = ({
  expense,
  busy,
  online,
  onClose,
  onSave,
}: {
  expense: Expense
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (reason: string) => void
}) => {
  const [reason, setReason] = useState('')
  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (reason.trim()) onSave(reason.trim())
      }}
    >
      <FormHeader title="Anular gasto" onClose={onClose} busy={busy} />
      <p className={warningClassName}>
        Anular no borra el gasto: conserva el importe, el motivo y corrige la caja.
      </p>
      <p className="font-semibold">
        {expense.description}, {centsToBolivianos(expense.amountCents)}
      </p>
      <Field label="Motivo de la anulación">
        <textarea
          className={cn(fieldClassName, 'min-h-24 py-3')}
          name="void-reason"
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <Button
        type="submit"
        variant="danger"
        size="lg"
        width="full"
        disabled={!online || busy || !reason.trim()}
      >
        {busy ? 'Anulando' : 'Anular gasto'}
      </Button>
    </form>
  )
}
