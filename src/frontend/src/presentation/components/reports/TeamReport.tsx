import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { basisPointsToPercent, type BarberPerformance } from '../../../core/reporting/Reporting'
import { Avatar } from '../Avatar'
import { StatusBadge } from '../StatusBadge'
import { Empty, ReportCard } from './ReportParts'
import { plural } from './reportText'

const Bar = ({ percent, label, value }: { percent: number; label: string; value?: string }) => (
  <div className="grid gap-1">
    <span className="flex items-baseline justify-between gap-3 text-sm text-ink-soft">
      {label}
      {value && <strong className="text-base text-ink tabular-nums lg:hidden">{value}</strong>}
    </span>
    <span className="block h-2.5 overflow-hidden rounded-full bg-surface-strong" aria-hidden="true">
      <span
        className="block h-full rounded-full bg-ink"
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </span>
  </div>
)

export const TeamReport = ({ rows }: { rows: BarberPerformance[] }) => {
  const sorted = [...rows].sort((a, b) => b.revenueCents - a.revenueCents)
  const top = sorted[0]
  const max = top?.revenueCents ?? 0

  return (
    <ReportCard id="report-team" title="Producción del equipo">
      {top && top.revenueCents > 0 ? (
        <>
          <p className="text-pretty text-ink-soft">
            <strong className="text-ink">{top.barberName}</strong> fue quien más produjo:{' '}
            {centsToBolivianos(top.revenueCents)}.
          </p>
          <ul className="mt-4 grid gap-3">
            {sorted.map((row) => (
              <li
                key={row.barberId}
                className="grid grid-cols-[minmax(0,1fr)] gap-4 rounded-control border border-line p-4 lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,1fr)] lg:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={row.barberName} tone="ink" />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold">
                      {row.barberName}
                      {row.isOwner && <StatusBadge tone="muted">Dueño</StatusBadge>}
                    </p>
                    <p className="text-ink-soft">
                      {plural(row.services, 'servicio', 'servicios')}
                      {row.products > 0 && `, ${plural(row.products, 'producto', 'productos')}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <Bar
                      percent={max ? (row.revenueCents / max) * 100 : 0}
                      label="Producción"
                      value={centsToBolivianos(row.revenueCents)}
                    />
                  </div>
                  <p className="hidden w-32 shrink-0 text-right font-display text-2xl font-extrabold tabular-nums lg:block">
                    {centsToBolivianos(row.revenueCents)}
                  </p>
                </div>
                <Bar
                  percent={row.occupancyBasisPoints / 100}
                  label={`${basisPointsToPercent(row.occupancyBasisPoints)} del horario con citas`}
                />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-pretty text-ink-soft">
            La ocupación compara el tiempo de citas completadas con el horario de cada barbero. Las
            llegadas sin cita suman producción, pero no ocupación. La producción del dueño no genera
            comisión.
          </p>
        </>
      ) : (
        <Empty>No hay producción registrada en este periodo.</Empty>
      )}
    </ReportCard>
  )
}
