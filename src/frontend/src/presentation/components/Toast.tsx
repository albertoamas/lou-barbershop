import { AnimatePresence, m } from 'motion/react'
import { useEffect } from 'react'
import { AppIcon } from './AppIcon'

interface ToastProps {
  message: string
  onDone: () => void
  // How long the message stays before closing by itself.
  durationMs?: number
}

// Confirmation that stays visible wherever the person has scrolled: fixed above the
// phone navigation bar and announced politely to screen readers.
export const Toast = ({ message, onDone, durationMs = 4000 }: ToastProps) => {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDone, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, onDone, durationMs])

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {message && (
          <m.p
            key={message}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-semibold text-on-ink shadow-overlay"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <AppIcon name="check" size={18} />
            {message}
          </m.p>
        )}
      </AnimatePresence>
    </div>
  )
}
