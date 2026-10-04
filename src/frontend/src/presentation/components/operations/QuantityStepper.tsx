import { AppIcon } from '../AppIcon'
import { cn } from '../../styles/cn'

interface QuantityStepperProps {
  // What is being counted, for the buttons' accessible names.
  name: string
  value: number
  max: number
  disabled?: boolean
  onChange: (value: number) => void
}

const stepButtonClassName =
  'grid size-11 place-items-center rounded-full border border-line-control bg-surface text-ink transition-colors duration-150 hover:bg-surface-muted disabled:pointer-events-none disabled:opacity-40'

// Minus and plus instead of a number field: no keyboard pops up on a phone and the
// count can never go below zero or above the stock.
export const QuantityStepper = ({ name, value, max, disabled, onChange }: QuantityStepperProps) => (
  <div className="flex shrink-0 items-center gap-1" role="group" aria-label={`Cantidad de ${name}`}>
    <button
      type="button"
      className={stepButtonClassName}
      aria-label={`Quitar uno de ${name}`}
      disabled={disabled || value <= 0}
      onClick={() => onChange(value - 1)}
    >
      <AppIcon name="minus" size={18} />
    </button>
    <output
      className={cn(
        'w-8 text-center font-display text-xl font-extrabold tabular-nums',
        value === 0 && 'text-ink-muted',
      )}
      aria-live="polite"
    >
      {value}
    </output>
    <button
      type="button"
      className={stepButtonClassName}
      aria-label={`Agregar uno de ${name}`}
      disabled={disabled || value >= max}
      onClick={() => onChange(value + 1)}
    >
      <AppIcon name="plus" size={18} />
    </button>
  </div>
)
