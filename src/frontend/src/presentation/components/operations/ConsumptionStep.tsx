import { useState } from 'react'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import type { InventoryItem } from '../../../core/inventory/Inventory'
import type { Operation } from '../../../core/sales/Sales'
import type { AvailableService } from '../../../core/scheduling/Scheduling'
import { cn } from '../../styles/cn'
import { errorClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { ActionBar } from './ActionBar'
import { QuantityStepper } from './QuantityStepper'

export interface ConsumptionInput {
  serviceIds: string[]
  products: { productId: string; quantity: number }[]
}

interface ConsumptionStepProps {
  operation: Operation
  services: AvailableService[] | undefined
  inventory: InventoryItem[] | undefined
  busy: boolean
  disabled: boolean
  error: string
  onSave: (input: ConsumptionInput) => void
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

export const ConsumptionStep = ({
  operation,
  services,
  inventory,
  busy,
  disabled,
  error,
  onSave,
}: ConsumptionStepProps) => {
  const [serviceIds, setServiceIds] = useState(() =>
    operation.items.flatMap((item) =>
      item.type === 'SERVICE' && item.serviceId ? [item.serviceId] : [],
    ),
  )
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      operation.items.flatMap((item) =>
        item.type === 'PRODUCT' && item.productId ? [[item.productId, item.quantity]] : [],
      ),
    ),
  )
  const products = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }))
  const productUnits = products.reduce((sum, item) => sum + item.quantity, 0)

  const toggle = (id: string) =>
    setServiceIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    )

  return (
    <div className="grid gap-8">
      <section aria-labelledby="done-services">
        <h3 id="done-services" className="font-display text-2xl font-extrabold">
          ¿Qué servicios se hicieron?
        </h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {services
            ?.filter((service) => service.active)
            .map((service) => {
              const chosen = serviceIds.includes(service.id)
              return (
                <button
                  key={service.id}
                  type="button"
                  className={cn(
                    'flex min-h-16 items-center gap-3 rounded-control border-2 px-4 py-3 text-left transition-colors duration-150',
                    chosen
                      ? 'border-ink bg-ink text-on-ink'
                      : 'border-line bg-surface hover:border-line-control',
                  )}
                  aria-pressed={chosen}
                  onClick={() => toggle(service.id)}
                >
                  <span
                    className={cn(
                      'grid size-6 shrink-0 place-items-center rounded-full border-2',
                      chosen ? 'border-on-ink bg-on-ink text-ink' : 'border-line-control',
                    )}
                    aria-hidden="true"
                  >
                    {chosen && <AppIcon name="check" size={14} />}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold">{service.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {centsToBolivianos(service.defaultPriceCents)}
                  </span>
                </button>
              )
            })}
        </div>
      </section>

      <section aria-labelledby="sold-products">
        <h3 id="sold-products" className="font-display text-2xl font-extrabold">
          ¿Se vendió algún producto?
        </h3>
        <ul className="mt-3 grid gap-2">
          {inventory
            ?.filter((item) => item.active)
            .map((item) => {
              const quantity = quantities[item.productId] ?? 0
              const soldOut = item.quantity <= 0 && quantity === 0
              return (
                <li
                  key={item.productId}
                  className={cn(
                    'flex min-h-16 items-center gap-3 rounded-control border-2 px-4 py-2',
                    quantity > 0 ? 'border-ink' : 'border-line',
                    soldOut ? 'bg-surface-muted' : 'bg-surface',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{item.name}</span>
                    <span className="block text-sm text-ink-soft">
                      {centsToBolivianos(item.salePriceCents)}.{' '}
                      {soldOut ? 'Sin stock' : `Quedan ${item.quantity}`}
                    </span>
                  </span>
                  <QuantityStepper
                    name={item.name}
                    value={quantity}
                    max={Math.max(item.quantity, quantity)}
                    disabled={disabled || soldOut}
                    onChange={(value) =>
                      setQuantities((current) => ({ ...current, [item.productId]: value }))
                    }
                  />
                </li>
              )
            })}
        </ul>
      </section>

      <ActionBar>
        {error && (
          <p className={errorClassName} role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ink-soft" aria-live="polite">
            {serviceIds.length === 0
              ? 'Elige al menos un servicio.'
              : [
                  plural(serviceIds.length, 'servicio', 'servicios'),
                  productUnits > 0 ? plural(productUnits, 'producto', 'productos') : '',
                ]
                  .filter(Boolean)
                  .join(' y ')}
          </p>
          <Button
            size="lg"
            className="max-sm:w-full"
            disabled={disabled || busy || serviceIds.length === 0}
            onClick={() => onSave({ serviceIds, products })}
          >
            {busy ? 'Guardando...' : 'Revisar y cobrar'}
          </Button>
        </div>
      </ActionBar>
    </div>
  )
}
