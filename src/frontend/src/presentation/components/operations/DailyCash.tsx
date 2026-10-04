import { centsToBolivianos } from '../../../core/configuration/Configuration'
import type { DailyOperations } from '../../../core/sales/Sales'
import { DateField } from '../agenda/DateField'

interface DailyCashProps {
  title: string
  date: string
  summary: DailyOperations | undefined
  onDateChange: (date: string) => void
}

// The day's internal cash: what was charged, split by method, for the chosen date.
export const DailyCash = ({ title, date, summary, onDateChange }: DailyCashProps) => (
  <section className="rounded-panel bg-surface p-5 shadow-raised" aria-labelledby="daily-cash">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id="daily-cash" className="font-display text-2xl font-extrabold">
        {title}
      </h2>
      <DateField id="caja-fecha" label="Fecha de la caja" value={date} onChange={onDateChange} />
    </div>
    <dl className="mt-4 grid grid-cols-2 gap-3">
      <div className="col-span-2 rounded-control bg-success-soft p-4 text-success-ink">
        <dt className="font-semibold">Total cobrado</dt>
        <dd className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">
          {centsToBolivianos(summary?.totalCents ?? 0)}
        </dd>
        <dd className="mt-1 text-sm">
          {summary?.paidCount === 1
            ? '1 atención pagada'
            : `${summary?.paidCount ?? 0} atenciones pagadas`}
        </dd>
      </div>
      <div className="rounded-control bg-surface-muted p-4">
        <dt className="text-sm font-semibold text-ink-soft">Efectivo</dt>
        <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums">
          {centsToBolivianos(summary?.cashCents ?? 0)}
        </dd>
      </div>
      <div className="rounded-control bg-surface-muted p-4">
        <dt className="text-sm font-semibold text-ink-soft">QR</dt>
        <dd className="mt-1 font-display text-2xl font-extrabold tabular-nums">
          {centsToBolivianos(summary?.qrCents ?? 0)}
        </dd>
      </div>
    </dl>
  </section>
)
