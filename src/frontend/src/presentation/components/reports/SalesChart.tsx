import { centsToBolivianos } from '../../../core/configuration/Configuration'
import type { SeriesBucket, SeriesGrain } from '../../../core/reporting/Reporting'
import { cn } from '../../styles/cn'
import { bucketLabel, bucketTitle, plural } from './reportText'

// Plain CSS bars: no chart library. The visible chart is decorative for screen readers,
// which get the same figures as a list.
export const SalesChart = ({ buckets, grain }: { buckets: SeriesBucket[]; grain: SeriesGrain }) => {
  const max = Math.max(...buckets.map((bucket) => bucket.totalCents), 0)
  const best = buckets.reduce<SeriesBucket | undefined>(
    (top, bucket) => (bucket.totalCents > (top?.totalCents ?? 0) ? bucket : top),
    undefined,
  )
  // Phones show about seven labels; wider screens show every label up to a month.
  const phoneStep = Math.max(1, Math.ceil(buckets.length / 7))

  if (!best)
    return (
      <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
        Sin ventas en este periodo.
      </p>
    )

  return (
    <div>
      <p className="text-pretty text-ink-soft">
        {grain === 'day' ? 'Mejor día' : grain === 'week' ? 'Mejor semana' : 'Mejor mes'}:{' '}
        <strong className="text-ink">{bucketTitle(best, grain)}</strong>, con{' '}
        {centsToBolivianos(best.totalCents)}.
      </p>
      <div aria-hidden="true" className="mt-4">
        <div className="flex h-48 items-end gap-0.5 border-b border-line sm:gap-1">
          {buckets.map((bucket) => (
            <div
              key={bucket.from}
              className="group relative flex h-full min-w-0 flex-1 items-end"
              title={`${bucketTitle(bucket, grain)}: ${centsToBolivianos(bucket.totalCents)}`}
            >
              <div
                className={cn(
                  'mx-auto w-full max-w-16 rounded-t-sm transition-colors duration-150',
                  bucket === best ? 'bg-ink' : 'bg-line-control group-hover:bg-ink-soft',
                )}
                style={{
                  height: `${max ? Math.max((bucket.totalCents / max) * 100, bucket.totalCents ? 2 : 0) : 0}%`,
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-0.5 sm:gap-1">
          {buckets.map((bucket, index) => (
            <span
              key={bucket.from}
              className={cn(
                'min-w-0 flex-1 text-center text-sm text-ink-soft tabular-nums',
                index % phoneStep !== 0 && 'max-sm:invisible',
                buckets.length > 16 && index % 2 !== 0 && 'sm:max-lg:invisible',
              )}
            >
              {bucketLabel(bucket, grain)}
            </span>
          ))}
        </div>
      </div>
      <ul className="sr-only">
        {buckets.map((bucket) => (
          <li key={bucket.from}>
            {bucketTitle(bucket, grain)}: {centsToBolivianos(bucket.totalCents)},{' '}
            {plural(bucket.count, 'atención', 'atenciones')}
          </li>
        ))}
      </ul>
    </div>
  )
}
