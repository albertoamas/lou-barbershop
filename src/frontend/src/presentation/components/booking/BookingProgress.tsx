import { cn } from '../../styles/cn'
import { bookingSteps } from './bookingFormat'

// Where the customer is in the five steps, named on every screen size.
export const BookingProgress = ({ current }: { current: number }) => (
  <nav aria-label="Progreso de la reserva">
    <p className="font-semibold text-ink-soft">
      Paso {current + 1} de {bookingSteps.length}:{' '}
      <span className="text-ink">{bookingSteps[current]}</span>
    </p>
    <ol className="mt-2 grid grid-cols-5 gap-1.5">
      {bookingSteps.map((label, index) => (
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className={cn(
            'h-2 rounded-full transition-colors duration-200',
            index < current && 'bg-success',
            index === current && 'bg-ink',
            index > current && 'bg-surface-strong',
          )}
        >
          <span className="sr-only">
            {label}
            {index < current ? ', hecho' : ''}
          </span>
        </li>
      ))}
    </ol>
  </nav>
)
