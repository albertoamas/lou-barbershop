import { Link } from 'react-router-dom'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { cashOutflows, type PeriodReport } from '../../../core/reporting/Reporting'
import { cn } from '../../styles/cn'
import { AppIcon } from '../AppIcon'
import { buttonStyles } from '../buttonStyles'
import { Empty, ReportCard, ShowMoreList } from './ReportParts'
import { dayMonth } from './reportText'

const Line = ({
  label,
  cents,
  strong = false,
}: {
  label: string
  cents: number
  strong?: boolean
}) => (
  <div
    className={cn(
      'flex items-baseline justify-between gap-3',
      strong && 'mt-1 border-t border-line pt-2 font-bold',
    )}
  >
    <dt className={strong ? undefined : 'text-ink-soft'}>{label}</dt>
    <dd className="tabular-nums">{centsToBolivianos(cents)}</dd>
  </div>
)

export const MoneyReport = ({ period }: { period: PeriodReport }) => {
  const collected = period.cashCollectedCents + period.qrCollectedCents
  const spent = period.inventoryPurchaseCents + period.expenseCents + period.commissionPaymentsCents
  const outflows = cashOutflows(period)
  const negative = period.cashFlowCents < 0

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <ReportCard id="money-in" title="Entró">
          <p className="font-display text-4xl leading-none font-extrabold tabular-nums">
            {centsToBolivianos(collected)}
          </p>
          <dl className="mt-4 grid gap-2">
            <Line label="Efectivo" cents={period.cashCollectedCents} />
            <Line label="QR" cents={period.qrCollectedCents} />
          </dl>
        </ReportCard>
        <ReportCard id="money-out" title="Salió">
          <p className="font-display text-4xl leading-none font-extrabold tabular-nums">
            {centsToBolivianos(spent)}
          </p>
          <dl className="mt-4 grid gap-2">
            <Line label="Compras de productos" cents={period.inventoryPurchaseCents} />
            <Line label="Gastos" cents={period.expenseCents} />
            <Line label="Pagos a barberos" cents={period.commissionPaymentsCents} />
          </dl>
        </ReportCard>
        <ReportCard
          id="money-left"
          title="Queda"
          className={cn(negative ? 'bg-danger-soft' : 'bg-success-soft')}
        >
          <p
            className={cn(
              'font-display text-4xl leading-none font-extrabold tabular-nums',
              negative ? 'text-danger-ink' : 'text-success-ink',
            )}
          >
            {centsToBolivianos(period.cashFlowCents)}
          </p>
          <p className="mt-1 font-semibold">
            {negative ? 'Salió más de lo que entró.' : 'Entró más de lo que salió.'}
          </p>
          <dl className="mt-4 grid gap-2">
            <Line label="En efectivo" cents={period.cashFlowCashCents} />
            <Line label="En QR" cents={period.cashFlowQrCents} />
          </dl>
        </ReportCard>
      </div>

      <ReportCard
        id="money-commissions"
        title="Comisiones de barberos"
        action={
          <Link
            className={cn(buttonStyles({ variant: 'secondary', size: 'sm' }))}
            to="/app/comisiones"
          >
            Ir a Comisiones
            <AppIcon name="arrow-right" size={18} />
          </Link>
        }
      >
        <p className="text-pretty text-ink-soft">
          Lo que se les debe no es dinero que haya salido. Sale de la caja recién cuando se paga una
          liquidación.
        </p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              ['Generadas en el periodo', period.commissionGeneratedCents],
              ['Sin liquidar', period.commissionAvailableCents],
              ['En liquidación', period.commissionSettledCents],
              ['Ya pagadas', period.commissionPaidCents],
            ] as const
          ).map(([label, cents]) => (
            <div key={label} className="rounded-control bg-surface-muted p-4">
              <dt className="text-ink-soft">{label}</dt>
              <dd className="text-xl font-bold tabular-nums">{centsToBolivianos(cents)}</dd>
            </div>
          ))}
        </dl>
      </ReportCard>

      <ReportCard id="money-outflows" title="Salidas del periodo">
        {outflows.length ? (
          <ShowMoreList
            items={outflows}
            render={(row) => (
              <li key={row.id} className="flex items-center gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{row.label}</span>
                  <span className="block text-ink-soft">
                    {dayMonth(row.date)}, en {row.method === 'CASH' ? 'efectivo' : 'QR'}
                  </span>
                </span>
                <span className="shrink-0 font-bold tabular-nums">
                  {centsToBolivianos(row.amountCents)}
                </span>
              </li>
            )}
          />
        ) : (
          <Empty>No salió dinero en este periodo.</Empty>
        )}
      </ReportCard>
    </div>
  )
}
