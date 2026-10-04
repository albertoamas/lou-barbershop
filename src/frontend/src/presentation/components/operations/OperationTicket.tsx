import { centsToBolivianos } from '../../../core/configuration/Configuration'
import type { Operation } from '../../../core/sales/Sales'

const Row = ({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) => (
  <div className="flex items-baseline justify-between gap-4">
    <dt className={strong ? 'font-semibold' : 'text-ink-soft'}>{label}</dt>
    <dd
      className={
        strong
          ? 'font-display text-3xl leading-none font-extrabold tabular-nums'
          : 'font-semibold tabular-nums'
      }
    >
      {value}
    </dd>
  </div>
)

// The ticket as the backend calculated it: lines, adjustments and the total to charge.
export const OperationTicket = ({ operation }: { operation: Operation }) => (
  <section className="rounded-panel bg-surface-muted p-5" aria-label="Detalle del cobro">
    <ul className="grid gap-3">
      {operation.items.map((item) => (
        <li key={item.id} className="flex items-start justify-between gap-4">
          <span className="min-w-0">
            <span className="block font-semibold">{item.description}</span>
            {item.quantity > 1 && (
              <span className="block text-sm text-ink-soft">
                {item.quantity} unidades de {centsToBolivianos(item.unitPriceCents)}
              </span>
            )}
          </span>
          <span className="shrink-0 font-semibold tabular-nums">
            {centsToBolivianos(item.unitPriceCents * item.quantity)}
          </span>
        </li>
      ))}
    </ul>
    <dl className="mt-4 grid gap-2 border-t border-line pt-4">
      {(operation.discountCents > 0 || operation.courtesyCents > 0) && (
        <Row label="Subtotal" value={centsToBolivianos(operation.subtotalCents)} />
      )}
      {operation.discountCents > 0 && (
        <Row label="Descuento" value={centsToBolivianos(operation.discountCents)} />
      )}
      {operation.courtesyCents > 0 && (
        <Row label="Cortesía" value={centsToBolivianos(operation.courtesyCents)} />
      )}
      <Row label="Total" value={centsToBolivianos(operation.totalCents)} strong />
    </dl>
    {operation.adjustmentReason && (
      <p className="mt-3 text-sm text-ink-soft">Motivo del ajuste: {operation.adjustmentReason}</p>
    )}
  </section>
)
