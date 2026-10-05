import { settlementStatusLabel, type Settlement } from '../../../core/commissions/Commissions'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { AppIcon } from '../AppIcon'
import { StatusBadge } from '../StatusBadge'
import { methodWord, periodText, settlementTone, shortDate } from './commissionText'

export const SettlementList = ({
  settlements,
  showBarber,
  empty,
  onOpen,
}: {
  settlements: Settlement[]
  showBarber: boolean
  empty: string
  onOpen: (settlement: Settlement) => void
}) =>
  settlements.length === 0 ? (
    <p className="rounded-control bg-surface-muted p-5 text-ink-soft">{empty}</p>
  ) : (
    <ul className="grid gap-2">
      {settlements.map((item) => {
        const period = periodText(item.periodStart, item.periodEnd)
        return (
          <li key={item.id}>
            <button
              type="button"
              className="flex min-h-16 w-full items-center gap-3 rounded-control bg-surface-muted px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-strong"
              onClick={() => onOpen(item)}
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{showBarber ? item.barberName : period}</span>
                <span className="block text-ink-soft">
                  {showBarber && `${period}. `}
                  {item.status === 'PAID' && item.paymentDate
                    ? `Pagada el ${shortDate(item.paymentDate)} en ${methodWord(item.paymentMethod)}.`
                    : `${settlementStatusLabel(item.status)}.`}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-display text-xl font-extrabold tabular-nums">
                  {centsToBolivianos(item.payableTotalCents)}
                </span>
                {item.status !== 'PAID' && (
                  <StatusBadge tone={settlementTone[item.status]}>
                    {settlementStatusLabel(item.status)}
                  </StatusBadge>
                )}
              </span>
              <AppIcon name="chevron-right" size={18} />
            </button>
          </li>
        )
      })}
    </ul>
  )
