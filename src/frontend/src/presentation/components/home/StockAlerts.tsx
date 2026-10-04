import type { InventoryItem } from '../../../core/inventory/Inventory'
import { HomeSection } from './HomeSection'

// Products under their minimum, so they are reordered before running out.
export const StockAlerts = ({ items }: { items: InventoryItem[] }) => {
  const low = items.filter((item) => item.active && item.lowStock)
  return (
    <HomeSection
      id="home-stock"
      title={low.length === 0 ? 'Stock en orden' : 'Stock bajo'}
      action={{ label: 'Ver inventario', to: '/app/inventario' }}
    >
      {low.length === 0 ? (
        <p className="text-ink-soft">Ningún producto está por debajo de su mínimo.</p>
      ) : (
        <ul className="grid gap-2">
          {low.slice(0, 4).map((item) => (
            <li
              key={item.productId}
              className="flex min-h-12 items-center justify-between gap-3 rounded-control bg-warning-soft px-4 text-warning-ink"
            >
              <span className="min-w-0 truncate font-semibold">{item.name}</span>
              <span className="shrink-0 tabular-nums">
                {item.quantity === 0 ? 'Agotado' : `Quedan ${item.quantity}`}
              </span>
            </li>
          ))}
          {low.length > 4 && (
            <li className="text-sm text-ink-soft">Y {low.length - 4} productos más.</li>
          )}
        </ul>
      )}
    </HomeSection>
  )
}
