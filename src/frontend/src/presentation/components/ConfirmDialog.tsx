import { m } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
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
      className="m-auto max-w-[calc(100%-2rem)] rounded-2xl border-0 bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      aria-labelledby="confirmation-title"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onCancel()
      }}
    >
      <m.div
        className="w-full max-w-md rounded-2xl bg-white p-6 text-lou-ink shadow-lou-lg sm:p-8"
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <p className="mb-2 text-xs font-bold tracking-[0.18em] text-lou-danger uppercase">
          Confirma esta acción
        </p>
        <h2 id="confirmation-title" className="m-0 font-display text-4xl leading-none font-bold">
          {title}
        </h2>
        <div className="mt-4 text-sm leading-6 text-lou-graphite/70">{children}</div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? 'Procesando…' : confirmLabel}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
        </div>
      </m.div>
    </dialog>
  )
}
