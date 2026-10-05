import { useState } from 'react'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import {
  stockLevel,
  stockMatches,
  stockStatus,
  stockStatusLabel,
  type InventoryItem,
  type StockFilter,
  type StockStatus,
} from '../../../core/inventory/Inventory'
import { cn } from '../../styles/cn'
import { fieldClassName } from '../../styles/formStyles'
import { Button } from '../Button'

// State by color and text, never color alone (plan section 3.4).
const statusStyle: Record<StockStatus, { badge: string; bar: string; text: string }> = {
  OUT: { badge: 'bg-danger-soft text-danger-ink', bar: 'bg-danger', text: 'text-danger-ink' },
  LOW: { badge: 'bg-warning-soft text-warning-ink', bar: 'bg-warning', text: 'text-warning-ink' },
  OK: { badge: 'bg-success-soft text-success-ink', bar: 'bg-success', text: 'text-success-ink' },
  INACTIVE: { badge: 'bg-surface-muted text-ink-soft', bar: 'bg-line', text: 'text-ink-soft' },
}

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors duration-150',
    active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:border-line-control',
  )

export const StockList = ({
  items,
  disabled,
  onOpen,
  onRestock,
}: {
  items: InventoryItem[]
  disabled: boolean
  onOpen: (item: InventoryItem) => void
  onRestock: (item: InventoryItem) => void
}) => {
  const [filter, setFilter] = useState<StockFilter>('ALL')
  const [search, setSearch] = useState('')
  const low = items.filter((item) => ['LOW', 'OUT'].includes(stockStatus(item))).length
  const out = items.filter((item) => stockStatus(item) === 'OUT').length
  const visible = items.filter((item) => stockMatches(item, filter, search))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <label className="grid gap-1">
          <span className="sr-only">Buscar producto o código</span>
          <input
            className={fieldClassName}
            name="product-search"
            type="search"
            placeholder="Buscar producto o código"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filtrar productos">
          {(
            [
              ['ALL', 'Todos', items.length],
              ['LOW', 'Stock bajo', low],
              ['OUT', 'Agotados', out],
            ] as const
          ).map(([value, label, count]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              className={chipClassName(filter === value)}
              onClick={() => setFilter(value)}
            >
              {label}
              <span className="tabular-nums opacity-75">{count}</span>
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
          No hay productos para este filtro.
        </p>
      ) : (
        <ul className="divide-y divide-surface-strong">
          {visible.map((item) => {
            const status = stockStatus(item)
            const style = statusStyle[status]
            return (
              <li key={item.productId} className="flex items-center gap-3 py-2">
                <button
                  type="button"
                  className="flex min-h-16 min-w-0 flex-1 items-center gap-4 rounded-control px-2 py-2 text-left transition-colors duration-150 hover:bg-surface-muted"
                  onClick={() => onOpen(item)}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{item.name}</span>
                    <span className="block text-sm text-ink-soft">
                      {item.sku ? `${item.sku}, ` : ''}
                      {centsToBolivianos(item.salePriceCents)}
                    </span>
                  </span>
                  <span className="hidden w-32 shrink-0 sm:block" aria-hidden="true">
                    <span className="block h-2 overflow-hidden rounded-full bg-surface-strong">
                      <span
                        className={cn('block h-full rounded-full', style.bar)}
                        style={{ width: `${stockLevel(item)}%` }}
                      />
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-2xl leading-none font-extrabold tabular-nums">
                      {item.quantity}
                    </span>
                    <span className={cn('block text-sm font-semibold sm:hidden', style.text)}>
                      {stockStatusLabel[status]}
                    </span>
                    <span className="hidden text-sm text-ink-soft sm:block">
                      mín. {item.minimumStock}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'w-24 shrink-0 rounded-full px-3 py-1 text-center text-sm font-semibold max-sm:hidden',
                      style.badge,
                    )}
                  >
                    {stockStatusLabel[status]}
                  </span>
                </button>
                {(status === 'OUT' || status === 'LOW') && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className={cn('shrink-0', status === 'OUT' && 'border-danger text-danger-ink')}
                    disabled={disabled}
                    aria-label={`Reponer ${item.name}`}
                    onClick={() => onRestock(item)}
                  >
                    Reponer
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
