import { m } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { AppIcon } from './AppIcon'
import { Button } from './Button'

interface ConfirmDialogProps {
  busy?: boolean
  cancelLabel?: string
  children: ReactNode
  confirmLabel: string
  title: string
  onCancel: () => void
  onConfirm: () => void
}

export const ConfirmDialog = ({
  busy = false,
  cancelLabel = 'Conservar cita',
  children,
  confirmLabel,
  title,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) => {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog
      ref={ref}
      className="m-auto max-w-[calc(100%-2rem)] rounded-sheet border-0 bg-transparent p-0 backdrop:bg-ink/60"
      aria-labelledby="confirmation-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <m.div
        className="w-full max-w-md rounded-sheet bg-surface p-6 text-ink shadow-overlay sm:p-8"
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-danger-ink">
          <AppIcon name="alert" size={26} />
        </span>
        <h2
          id="confirmation-title"
          className="m-0 font-display text-4xl leading-none font-extrabold"
        >
          {title}
        </h2>
        <div className="mt-4 leading-6 text-ink-soft">{children}</div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? 'Procesando...' : confirmLabel}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </m.div>
    </dialog>
  )
}
