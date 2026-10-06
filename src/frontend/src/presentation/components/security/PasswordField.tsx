import { useState, type InputHTMLAttributes } from 'react'
import { cn } from '../../styles/cn'
import { fieldClassName, labelClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'

// Password input with its own show and hide button.
export const PasswordField = ({
  id,
  label,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { id: string; label: string }) => {
  const [visible, setVisible] = useState(false)
  return (
    <div className="grid gap-2">
      <label className={labelClassName} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          className={cn(fieldClassName, 'pr-14')}
          type={visible ? 'text' : 'password'}
          {...props}
        />
        <button
          type="button"
          className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-control text-ink-soft transition-colors duration-150 hover:text-ink"
          aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
        >
          <AppIcon name={visible ? 'eye-off' : 'eye'} size={20} />
        </button>
      </div>
    </div>
  )
}
