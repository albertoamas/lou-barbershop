import type { ReactNode } from 'react'
import { cn } from '../styles/cn'

export const SystemStateCard = ({
  eyebrow,
  title,
  message,
  children,
  requestId,
  fullHeight = false,
}: {
  eyebrow: string
  title: string
  message: string
  children: ReactNode
  requestId?: string | undefined
  fullHeight?: boolean
}) => (
  <main
    className={cn(
      'grid place-items-center px-4 py-10 sm:px-6',
      fullHeight ? 'min-h-dvh' : 'min-h-[65dvh]',
    )}
  >
    <section className="w-full max-w-xl rounded-sheet bg-surface p-7 shadow-floating sm:p-10">
      <p className="text-sm font-semibold text-ink-muted">{eyebrow}</p>
      <h1 className="mt-3 font-display text-5xl leading-[0.94] font-extrabold sm:text-6xl">
        {title}
      </h1>
      <p className="mt-4 max-w-md leading-6 text-ink-soft">{message}</p>
      {requestId && (
        <p className="mt-4 rounded-control bg-surface-muted p-3 text-sm break-all text-ink-muted">
          Identificador de solicitud: <code>{requestId}</code>
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">{children}</div>
    </section>
  </main>
)
