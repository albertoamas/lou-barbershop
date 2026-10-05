import { useState } from 'react'
import {
  commissionMatches,
  commissionStatusLabel,
  entriesByDay,
  rateAsPercent,
  type CommissionEntry,
  type CommissionFilter,
} from '../../../core/commissions/Commissions'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { cn } from '../../styles/cn'
import { Button } from '../Button'
import { StatusBadge } from '../StatusBadge'
import { commissionTone, dayHeading, timeOf } from './commissionText'

const pageSize = 30

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors duration-150',
    active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:border-line-control',
  )

const filters: [CommissionFilter, string][] = [
  ['ALL', 'Todas'],
  ['AVAILABLE', 'Sin liquidar'],
  ['SETTLED', 'En liquidación'],
  ['PAID', 'Pagadas'],
  ['VOIDED', 'Anuladas'],
]

// Every commission, newest first and grouped by day, a page at a time.
export const MovementList = ({
  entries,
  barbers,
  today,
}: {
  entries: CommissionEntry[]
  // Shown only to the owner, who sees the whole team.
  barbers?: { id: string; name: string }[]
  today: string
}) => {
  const [filter, setFilter] = useState<CommissionFilter>('ALL')
  const [barberId, setBarberId] = useState('')
  const [limit, setLimit] = useState(pageSize)
  const scoped = entries.filter((entry) => commissionMatches(entry, 'ALL', barberId))
  const visible = scoped.filter((entry) => commissionMatches(entry, filter, barberId))
  const days = entriesByDay(
    [...visible].sort((a, b) => b.earnedAt.localeCompare(a.earnedAt)).slice(0, limit),
  )
  const nameOf = (id: string) => barbers?.find((barber) => barber.id === id)?.name
  const choose = (apply: () => void) => {
    apply()
    setLimit(pageSize)
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {barbers && barbers.length > 1 && (
        <div
          className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:-mx-6 sm:px-6"
          role="group"
          aria-label="Filtrar por barbero"
        >
          {[{ id: '', name: 'Todo el equipo' }, ...barbers].map((barber) => (
            <button
              key={barber.id || 'all'}
              type="button"
              aria-pressed={barberId === barber.id}
              className={chipClassName(barberId === barber.id)}
              onClick={() => choose(() => setBarberId(barber.id))}
            >
              {barber.name}
            </button>
          ))}
        </div>
      )}
      <div
        className="-mx-5 flex gap-2 overflow-x-auto px-5 sm:-mx-6 sm:px-6"
        role="group"
        aria-label="Filtrar por estado"
      >
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            className={chipClassName(filter === value)}
            onClick={() => choose(() => setFilter(value))}
          >
            {label}
            <span className="tabular-nums opacity-75">
              {scoped.filter((entry) => commissionMatches(entry, value, barberId)).length}
            </span>
          </button>
        ))}
      </div>

      {days.length === 0 ? (
        <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
          No hay comisiones para este filtro.
        </p>
      ) : (
        <div className="grid gap-5">
          {days.map((day) => (
            <section key={day.date} aria-label={dayHeading(day.date, today)}>
              <h3 className="flex items-baseline justify-between gap-3 border-b border-line pb-2 font-semibold">
                <span>{dayHeading(day.date, today)}</span>
                <span className="text-ink-soft tabular-nums">
                  {centsToBolivianos(day.totalCents)}
                </span>
              </h3>
              <ul className="divide-y divide-surface-strong">
                {day.items.map((entry) => {
                  const barber = barbers && !barberId ? nameOf(entry.barberId) : undefined
                  return (
                    <li key={entry.id} className="flex items-center gap-3 py-3">
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            'block truncate font-semibold',
                            entry.status === 'VOIDED' && 'line-through',
                          )}
                        >
                          {entry.type === 'REVERSAL'
                            ? `Corrección: ${entry.description}`
                            : entry.description}
                        </span>
                        <span className="block text-ink-soft">
                          {timeOf(entry.earnedAt)}
                          {barber ? `, ${barber}` : ''}, {rateAsPercent(entry.rateBasisPoints)} de{' '}
                          {centsToBolivianos(entry.baseCents)}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span
                          className={cn(
                            'font-bold tabular-nums',
                            entry.status === 'VOIDED' && 'text-ink-muted line-through',
                          )}
                        >
                          {centsToBolivianos(entry.amountCents)}
                        </span>
                        <StatusBadge tone={commissionTone[entry.status]}>
                          {commissionStatusLabel(entry.status)}
                        </StatusBadge>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
          {visible.length > limit && (
            <Button
              variant="secondary"
              width="full"
              onClick={() => setLimit((value) => value + pageSize)}
            >
              Mostrar más ({visible.length - limit} restantes)
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
