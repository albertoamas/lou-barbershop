import { exceptionWhen, isUpcomingException } from '../../../core/scheduling/Availability'
import type { AvailabilityException } from '../../../core/scheduling/Scheduling'
import { cn } from '../../styles/cn'
import { Button } from '../Button'

const kindLabel = (exception: AvailabilityException) =>
  exception.kind === 'UNAVAILABLE' ? 'Ausencia' : 'Horario especial'

const Item = ({
  exception,
  canRemove,
  busy,
  onRemove,
}: {
  exception: AvailabilityException
  canRemove: boolean
  busy: boolean
  onRemove: () => void
}) => (
  <li className="flex flex-wrap items-center gap-3 rounded-control bg-surface-muted px-4 py-3">
    <span
      className={cn(
        'rounded-full px-3 py-1 text-sm font-semibold',
        exception.kind === 'UNAVAILABLE'
          ? 'bg-warning-soft text-warning-ink'
          : 'bg-success-soft text-success-ink',
        !exception.active && 'bg-surface text-ink-soft line-through',
      )}
    >
      {kindLabel(exception)}
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-semibold first-letter:uppercase">{exceptionWhen(exception)}</span>
      <span className="block text-ink-soft">{exception.reason}</span>
    </span>
    {canRemove && (
      <Button
        variant="dangerSoft"
        size="sm"
        disabled={busy}
        aria-label={`Quitar ${kindLabel(exception).toLowerCase()}, ${exceptionWhen(exception)}`}
        onClick={onRemove}
      >
        Quitar
      </Button>
    )}
  </li>
)

// Upcoming absences and special hours first; past or removed ones stay folded.
export const ExceptionList = ({
  exceptions,
  today,
  canManage,
  busy,
  disabled,
  onRemove,
}: {
  exceptions: AvailabilityException[]
  today: string
  canManage: boolean
  busy: boolean
  disabled: boolean
  onRemove: (exception: AvailabilityException) => void
}) => {
  const upcoming = exceptions
    .filter((item) => isUpcomingException(item, today))
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt))
  const history = exceptions.filter((item) => !isUpcomingException(item, today))
  return (
    <div className="grid gap-3">
      {upcoming.length === 0 ? (
        <p className="rounded-control bg-surface-muted p-4 text-ink-soft">
          No hay ausencias ni horarios especiales próximos.
        </p>
      ) : (
        <ul className="grid gap-2">
          {upcoming.map((exception) => (
            <Item
              key={exception.id}
              exception={exception}
              canRemove={canManage && !disabled}
              busy={busy}
              onRemove={() => onRemove(exception)}
            />
          ))}
        </ul>
      )}
      {history.length > 0 && (
        <details className="rounded-control bg-surface-muted">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">
            Ver historial ({history.length})
          </summary>
          <ul className="grid gap-2 px-2 pb-2">
            {history.map((exception) => (
              <Item
                key={exception.id}
                exception={exception}
                canRemove={false}
                busy={busy}
                onRemove={() => undefined}
              />
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
