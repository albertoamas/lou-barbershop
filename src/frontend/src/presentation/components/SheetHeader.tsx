import type { ReactNode } from 'react'
import { AppIcon } from './AppIcon'
import { Button } from './Button'

export const SheetHeader = ({
  title,
  children,
  busy = false,
  onBack,
  onClose,
}: {
  title: string
  children?: ReactNode
  busy?: boolean
  onBack?: (() => void) | undefined
  onClose: () => void
}) => (
  <div className="mb-6">
    {onBack && (
      <Button variant="ghost" size="sm" className="-ml-3 mb-2" disabled={busy} onClick={onBack}>
        <AppIcon name="arrow-left" size={18} />
        Volver
      </Button>
    )}
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-3xl font-extrabold text-balance">{title}</h2>
        {children}
      </div>
      <Button
        variant="ghost"
        className="-mt-1 -mr-2 size-12 shrink-0 px-0"
        aria-label="Cerrar"
        disabled={busy}
        onClick={onClose}
      >
        <AppIcon name="close" />
      </Button>
    </div>
  </div>
)
