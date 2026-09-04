import { useEffect, useRef, type ReactNode } from 'react'

export const AgendaDialog = ({ children, label }: { children: ReactNode; label: string }) => {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="agenda-dialog"
      aria-label={label}
      onCancel={(event) => event.preventDefault()}
    >
      {children}
    </dialog>
  )
}
