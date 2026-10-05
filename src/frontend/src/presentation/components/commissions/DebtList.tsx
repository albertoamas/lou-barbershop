import {
  settlementStatusLabel,
  type BarberDebt,
  type Settlement,
} from '../../../core/commissions/Commissions'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { StatusBadge } from '../StatusBadge'
import { nextActionLabel, periodText, plural, settlementTone } from './commissionText'

// One row per contracted barber: what is owed, where it stands and the next step.
export const DebtList = ({
  debts,
  disabled,
  onPrepare,
  onOpen,
}: {
  debts: BarberDebt[]
  disabled: boolean
  onPrepare: (barberId: string) => void
  onOpen: (settlement: Settlement) => void
}) =>
  debts.length === 0 ? (
    <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
      No hay barberos contratados activos.
    </p>
  ) : (
    <ul className="grid gap-3">
      {debts.map((debt) => {
        const open = debt.open
        return (
          <li
            key={debt.barberId}
            className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-control border border-line p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-center"
          >
            <div className="flex min-w-0 items-start gap-3">
              <Avatar
                name={debt.name}
                tone={debt.owedCents > 0 ? 'ink' : 'neutral'}
                className="max-sm:hidden"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <h3 className="min-w-0 text-lg font-bold">{debt.name}</h3>
                  <p className="shrink-0 font-display text-2xl font-extrabold tabular-nums">
                    {centsToBolivianos(debt.owedCents)}
                  </p>
                </div>
                <ul className="mt-2 grid gap-2 text-ink-soft">
                  {open && (
                    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <StatusBadge tone={settlementTone[open.status]}>
                        {settlementStatusLabel(open.status)}
                      </StatusBadge>
                      <span>
                        {centsToBolivianos(open.payableTotalCents)} del{' '}
                        {periodText(open.periodStart, open.periodEnd)}
                      </span>
                    </li>
                  )}
                  {debt.availableCount > 0 && (
                    <li>
                      {centsToBolivianos(debt.availableCents)} sin liquidar,{' '}
                      {plural(debt.availableCount, 'comisión', 'comisiones')}
                    </li>
                  )}
                  {debt.next === 'none' && <li>No se le debe nada.</li>}
                </ul>
              </div>
            </div>
            {debt.next !== 'none' && (
              <div className="grid">
                {open ? (
                  <Button
                    variant={debt.next === 'pay' ? 'money' : 'primary'}
                    aria-label={`${nextActionLabel[debt.next === 'pay' ? 'pay' : 'review']} de ${debt.name}`}
                    onClick={() => onOpen(open)}
                  >
                    {nextActionLabel[debt.next === 'pay' ? 'pay' : 'review']}
                  </Button>
                ) : (
                  <Button
                    disabled={disabled}
                    aria-label={`${nextActionLabel.prepare} de ${debt.name}`}
                    onClick={() => onPrepare(debt.barberId)}
                  >
                    {nextActionLabel.prepare}
                  </Button>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
