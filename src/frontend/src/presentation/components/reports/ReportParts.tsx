import { useState, type ReactNode } from 'react'
import { cn } from '../../styles/cn'
import { Button } from '../Button'

export const ReportCard = ({
  title,
  id,
  action,
  className,
  children,
}: {
  title: string
  id: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) => (
  <section
    className={cn('rounded-panel bg-surface p-5 shadow-raised sm:p-6', className)}
    aria-labelledby={id}
  >
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="font-display text-2xl font-extrabold text-balance">
        {title}
      </h2>
      {action}
    </div>
    {children}
  </section>
)

// A headline figure with its comparison, worded so color is never the only cue.
export const Kpi = ({
  label,
  value,
  change,
  trend,
}: {
  label: string
  value: string
  change?: string | undefined
  trend?: 'up' | 'down' | 'flat' | undefined
}) => (
  <div className="rounded-panel bg-surface p-5 shadow-raised">
    <p className="font-semibold text-ink-soft">{label}</p>
    <p className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">{value}</p>
    {change && (
      <p
        className={cn(
          'mt-2 text-sm font-semibold',
          trend === 'up' && 'text-success-ink',
          trend === 'down' && 'text-danger-ink',
          (!trend || trend === 'flat') && 'text-ink-soft',
        )}
      >
        {change}
      </p>
    )}
  </div>
)

export const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-control bg-surface-muted p-5 text-ink-soft">{children}</p>
)

const pageSize = 10

// Long source lists start short; the rest is one tap away.
export const ShowMoreList = <T,>({
  items,
  render,
  className,
}: {
  items: T[]
  render: (item: T) => ReactNode
  className?: string
}) => {
  const [limit, setLimit] = useState(pageSize)
  return (
    <>
      <ul className={cn('divide-y divide-surface-strong', className)}>
        {items.slice(0, limit).map(render)}
      </ul>
      {items.length > limit && (
        <Button
          variant="secondary"
          width="full"
          className="mt-3"
          onClick={() => setLimit((value) => value + pageSize * 3)}
        >
          Mostrar más ({items.length - limit} restantes)
        </Button>
      )}
    </>
  )
}
