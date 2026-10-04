import { useEffect, useRef, type ReactNode } from 'react'
import { m } from 'motion/react'

interface AgendaDialogProps {
  children: ReactNode
  label: string
  // Called on Escape. Without it Escape is ignored, for flows that must not be dropped.
  onClose?: () => void
}

// Detail and edit panel (plan section 6.3): a bottom sheet on phones and a side panel
// that leaves the list visible on tablets and desktop.
export const AgendaDialog = ({ children, label, onClose }: AgendaDialogProps) => {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    // A modal dialog does not stop the page behind it from scrolling; lock it while open.
    const root = document.documentElement
    const previousOverflow = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = previousOverflow
      element?.close()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-2xl border-0 bg-transparent p-0 backdrop:bg-ink/55 max-sm:mt-auto max-sm:h-fit max-sm:max-h-[92dvh] max-sm:max-w-none"
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
    >
      <m.div
        className="h-full overflow-y-auto overscroll-contain rounded-l-sheet bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-ink shadow-overlay max-sm:max-h-[92dvh] max-sm:rounded-t-sheet max-sm:rounded-b-none sm:p-7"
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        <span
          aria-hidden="true"
          className="mx-auto mb-4 block h-1 w-10 rounded-full bg-line sm:hidden"
        />
        {children}
      </m.div>
    </dialog>
  )
}
