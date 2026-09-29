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
    <section className="w-full max-w-xl rounded-3xl border border-lou-fog bg-white p-7 shadow-lou-lg sm:p-10">
      <p className="text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">{eyebrow}</p>
      <h1 className="mt-4 font-display text-5xl leading-[0.94] font-bold sm:text-6xl">{title}</h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-lou-graphite/65">{message}</p>
      {requestId && (
        <p className="mt-4 break-all rounded-xl bg-lou-paper p-3 text-xs text-lou-graphite/60">
          Identificador de solicitud: <code>{requestId}</code>
        </p>
      )}
      <div className="mt-8 flex flex-wrap gap-3">{children}</div>
    </section>
  </main>
)
