import { useEffect, useRef, type ReactNode } from 'react'
import { m } from 'motion/react'

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
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-2xl border-0 bg-transparent p-0 backdrop:bg-black/55 backdrop:backdrop-blur-sm max-sm:mt-auto max-sm:h-[92dvh] max-sm:max-w-none"
      aria-label={label}
      onCancel={(event) => event.preventDefault()}
    >
      <m.div
        className="h-full overflow-y-auto rounded-l-2xl bg-white p-5 text-lou-ink shadow-lou-lg max-sm:rounded-t-2xl max-sm:rounded-b-none sm:p-7"
        initial={{ opacity: 0, x: 28 }}
        animate={{ opacity: 1, x: 0 }}
      >
        {children}
      </m.div>
    </dialog>
  )
}
