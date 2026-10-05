import type { PaymentMethod } from '../../core/sales/Sales'
import { cn } from '../styles/cn'
import { choiceClassName } from '../styles/formStyles'
import { AppIcon } from './AppIcon'

export const MethodToggle = ({
  value,
  onChange,
}: {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}) => (
  <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Medio de pago">
    {(
      [
        ['CASH', 'Efectivo', 'cash'],
        ['QR', 'QR', 'qr'],
      ] as const
    ).map(([method, label, icon]) => (
      <button
        key={method}
        type="button"
        role="radio"
        aria-checked={value === method}
        className={cn(
          choiceClassName(value === method),
          'inline-flex items-center justify-center gap-2',
        )}
        onClick={() => onChange(method)}
      >
        <AppIcon name={icon} size={20} />
        {label}
      </button>
    ))}
  </div>
)
