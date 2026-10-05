import { centsToBolivianos } from '../../../core/configuration/Configuration'
import {
  largestExpense,
  percentChange,
  resultLines,
  salesSeries,
  type OperationReportSource,
  type PeriodReport,
} from '../../../core/reporting/Reporting'
import { cn } from '../../styles/cn'
import { Empty, Kpi, ReportCard, ShowMoreList } from './ReportParts'
import { SalesChart } from './SalesChart'
import { changeText, dayMonth, plural, rangeText } from './reportText'

const trendOf = (change: number | null): 'up' | 'down' | 'flat' | undefined =>
  change === null ? undefined : change > 0 ? 'up' : change < 0 ? 'down' : 'flat'

const paidWith = (row: OperationReportSource) =>
  row.cashCents > 0 && row.qrCents > 0 ? 'efectivo y QR' : row.qrCents > 0 ? 'QR' : 'efectivo'

const OperationRow = ({ row }: { row: OperationReportSource }) => {
  const parts = [
    row.serviceQuantity > 0 && plural(row.serviceQuantity, 'servicio', 'servicios'),
    row.productQuantity > 0 && plural(row.productQuantity, 'producto', 'productos'),
  ].filter(Boolean)
  return (
    <li className="flex items-center gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">
          {row.customerName}, con {row.barberName}
        </span>
        <span className="block text-ink-soft">
          {dayMonth(row.date)}. {parts.join(' y ') || 'Sin detalle'}, pagado en {paidWith(row)}.
        </span>
      </span>
      <span className="shrink-0 font-bold tabular-nums">{centsToBolivianos(row.totalCents)}</span>
    </li>
  )
}

export const SummaryReport = ({
  period,
  previous,
  comparison,
}: {
  period: PeriodReport
  previous?: PeriodReport | undefined
  comparison: { from: string; to: string }
}) => {
  const lines = resultLines(period)
  const series = salesSeries(period.operations, period.dateFrom, period.dateTo)
  const compare = (current: number, before: number | undefined) => {
    if (before === undefined) return {}
    const change = percentChange(current, before)
    return { change: changeText(change), trend: trendOf(change) }
  }
  const previousSales = previous && resultLines(previous).salesCents
  const negative = lines.resultCents < 0
  const biggest = largestExpense(period.expenses)

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <p className="text-ink-soft">
        Comparado con {comparison.from === comparison.to ? 'el' : 'el periodo del'}{' '}
        {rangeText(comparison.from, comparison.to)}.
      </p>
      <div className="-mt-2 grid gap-3 sm:grid-cols-3">
        <Kpi
          label="Ventas"
          value={centsToBolivianos(lines.salesCents)}
          {...compare(lines.salesCents, previousSales)}
        />
        <Kpi
          label="Atenciones cobradas"
          value={String(period.paidOperationCount)}
          {...compare(period.paidOperationCount, previous?.paidOperationCount)}
        />
        <Kpi
          label="Ticket promedio"
          value={centsToBolivianos(period.averageTicketCents)}
          {...compare(period.averageTicketCents, previous?.averageTicketCents)}
        />
      </div>

      <ReportCard id="report-sales-chart" title="Ventas en el periodo">
        <SalesChart buckets={series.buckets} grain={series.grain} />
      </ReportCard>

      <ReportCard id="report-result" title="Cómo se forma el resultado">
        <dl className="grid gap-2">
          {(
            [
              ['Ventas de servicios y productos', lines.salesCents],
              ['Menos costo de los productos vendidos', lines.productCostCents],
              ['Menos comisiones de barberos', lines.commissionCents],
              ['Menos gastos', lines.expenseCents],
            ] as const
          ).map(([label, cents]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">{label}</dt>
              <dd className="font-semibold tabular-nums">{centsToBolivianos(cents)}</dd>
            </div>
          ))}
          <div
            className={cn(
              'mt-2 flex flex-wrap items-baseline justify-between gap-3 rounded-control p-4',
              negative ? 'bg-danger-soft text-danger-ink' : 'bg-success-soft text-success-ink',
            )}
          >
            <dt className="font-semibold">
              {negative ? 'Resultado: pérdida' : 'Resultado: ganancia'}
            </dt>
            <dd className="font-display text-3xl font-extrabold tabular-nums">
              {centsToBolivianos(lines.resultCents)}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-pretty text-ink-soft">
          {negative &&
            `Las comisiones y los gastos superaron lo que dejaron las ventas.${
              biggest
                ? ` El gasto más alto fue ${biggest.category}, ${centsToBolivianos(biggest.amountCents)}.`
                : ''
            } `}
          Es un resultado aproximado, no la utilidad fiscal. Las compras de productos se ven en
          Dinero.
        </p>
      </ReportCard>

      <ReportCard id="report-operations" title="Atenciones cobradas">
        {period.operations.length ? (
          <ShowMoreList
            items={[...period.operations].reverse()}
            render={(row) => <OperationRow key={row.id} row={row} />}
          />
        ) : (
          <Empty>No hay atenciones cobradas en este periodo.</Empty>
        )}
      </ReportCard>
    </div>
  )
}
