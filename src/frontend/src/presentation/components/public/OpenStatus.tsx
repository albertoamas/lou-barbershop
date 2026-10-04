import { openingStatus, openingStatusText } from '../../../core/shop/OpeningHours'
import { cn } from '../../styles/cn'

// "Abierto ahora, hasta las 21:00" with a dot that is green while open. The text always
// carries the meaning; the dot only reinforces it.
export const OpenStatus = ({ now, onDark = false }: { now: Date; onDark?: boolean }) => {
  const status = openingStatus(now)
  return (
    <p
      className={cn(
        'inline-flex min-h-10 w-fit items-center gap-2 rounded-full px-4 font-semibold',
        onDark
          ? 'bg-on-ink/10 text-on-ink'
          : status.open
            ? 'bg-success-soft text-success-ink'
            : 'bg-surface-muted text-ink-soft',
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-2.5 rounded-full', status.open ? 'bg-success' : 'bg-ink-muted')}
      />
      {openingStatusText(status)}
    </p>
  )
}
