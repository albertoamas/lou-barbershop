import { useState, type ReactNode } from 'react'
import { cn } from '../styles/cn'
import { AppIcon, type IconName } from './AppIcon'
import { BrandLockup } from './BrandLockup'
import { Button } from './Button'

const CopyRequestId = ({ value }: { value: string }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2 rounded-control bg-surface-muted p-3">
      <p className="min-w-0 flex-1 text-sm text-ink-soft">
        Código para soporte: <code className="break-all text-ink">{value}</code>
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() =>
          void navigator.clipboard
            .writeText(value)
            .then(() => setCopied(true))
            .catch(() => setCopied(false))
        }
      >
        <AppIcon name={copied ? 'check' : 'copy'} size={18} />
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  )
}

// One shape for every system state (plan section 6.5): an icon that names the case, a
// short title, one plain sentence and the ways out. Outside the app shell it carries the
// brand on the warm paper background, like the login screen.
export const SystemStateCard = ({
  icon,
  title,
  message,
  note,
  children,
  requestId,
  standalone = false,
}: {
  icon: IconName
  title: string
  message: ReactNode
  // A second, quieter sentence such as what happened to unsaved work.
  note?: string
  children: ReactNode
  requestId?: string | undefined
  standalone?: boolean
}) => (
  <main
    className={cn(
      'grid px-4 py-10 sm:px-6',
      standalone
        ? 'min-h-dvh content-start justify-items-center gap-8 bg-paper-warm sm:content-center'
        : 'min-h-[65dvh] place-items-center',
    )}
  >
    {standalone && <BrandLockup className="text-ink" linked={false} />}
    <section className="w-full max-w-xl rounded-panel bg-surface p-7 shadow-raised sm:p-10">
      <span className="grid size-14 place-items-center rounded-full bg-surface-muted text-ink">
        <AppIcon name={icon} size={28} />
      </span>
      <h1 className="mt-5 font-display text-4xl leading-none font-extrabold text-balance sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-lg text-pretty text-ink-soft">{message}</p>
      {note && <p className="mt-2 text-pretty text-ink-soft">{note}</p>}
      {requestId && <CopyRequestId value={requestId} />}
      <div className="mt-8 flex flex-wrap gap-3 max-sm:grid">{children}</div>
    </section>
  </main>
)
