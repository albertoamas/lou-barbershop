import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { isPendingOperation, operationStatus, type Operation } from '../../../core/sales/Sales'
import { cn } from '../../styles/cn'
import { Avatar } from '../Avatar'
import { StatusBadge } from '../StatusBadge'
import { operationTone } from './operationText'

interface OperationQueueProps {
  // Pending ones lead the screen; charged ones go after the day's cash.
  show: 'pending' | 'closed'
  operations: Operation[]
  selectedId?: string | undefined
  onSelect: (operation: Operation) => void
}

const OperationRow = ({
  operation,
  selected,
  onSelect,
}: {
  operation: Operation
  selected: boolean
  onSelect: () => void
}) => (
  <li>
    <button
      type="button"
      className={cn(
        'flex min-h-18 w-full items-center gap-3 rounded-control border-2 bg-surface px-4 py-3 text-left transition-[border-color,box-shadow] duration-150 hover:shadow-floating',
        selected ? 'border-ink shadow-floating' : 'border-transparent shadow-raised',
      )}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
    >
      <Avatar name={operation.customerName} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{operation.customerName}</span>
        <span className="block truncate text-sm text-ink-soft">con {operation.barberName}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-display text-xl leading-none font-extrabold tabular-nums">
          {centsToBolivianos(operation.totalCents)}
        </span>
        <StatusBadge tone={operationTone[operation.status]} className="min-h-6 px-2">
          {operationStatus(operation.status)}
        </StatusBadge>
      </span>
    </button>
  </li>
)

// What reception works through all day: who is waiting to pay, and what was charged.
export const OperationQueue = ({ show, operations, selectedId, onSelect }: OperationQueueProps) => {
  const pending = operations.filter(isPendingOperation)
  const closed = operations.filter((operation) => !isPendingOperation(operation))
  if (show === 'pending')
    return (
      <section aria-labelledby="queue-pending">
        <h2 id="queue-pending" className="mb-3 font-display text-2xl font-extrabold">
          Por cobrar <span className="text-ink-muted tabular-nums">{pending.length}</span>
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-panel border-2 border-dashed border-line p-5 text-ink-soft">
            Nadie espera para pagar. Cuando abras una atención desde la agenda o registres una
            llegada sin cita, aparecerá aquí.
          </p>
        ) : (
          <ul className="grid gap-2">
            {pending.map((operation) => (
              <OperationRow
                key={operation.id}
                operation={operation}
                selected={operation.id === selectedId}
                onSelect={() => onSelect(operation)}
              />
            ))}
          </ul>
        )}
      </section>
    )
  return closed.length === 0 ? null : (
    <section aria-labelledby="queue-closed">
      <h2 id="queue-closed" className="mb-3 font-display text-2xl font-extrabold">
        Cobradas <span className="text-ink-muted tabular-nums">{closed.length}</span>
      </h2>
      <ul className="grid gap-2">
        {closed.map((operation) => (
          <OperationRow
            key={operation.id}
            operation={operation}
            selected={operation.id === selectedId}
            onSelect={() => onSelect(operation)}
          />
        ))}
      </ul>
    </section>
  )
}
