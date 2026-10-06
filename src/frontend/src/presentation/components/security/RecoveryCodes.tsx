import { useEffect, useMemo, useState } from 'react'
import { recoveryCodesText } from '../../../core/auth/Security'
import { cn } from '../../styles/cn'
import { buttonStyles } from '../buttonStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'

// Shown once, right after activation: copy or download them before closing.
export const RecoveryCodes = ({
  codes,
  userName,
  date,
  saved,
  onSavedChange,
}: {
  codes: string[]
  userName: string
  date: string
  saved: boolean
  onSavedChange: (saved: boolean) => void
}) => {
  const [copied, setCopied] = useState(false)
  const text = recoveryCodesText(codes, userName, date)
  const href = useMemo(() => URL.createObjectURL(new Blob([text], { type: 'text/plain' })), [text])
  useEffect(() => () => URL.revokeObjectURL(href), [href])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join('\n'))
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="grid gap-4">
      <p className="rounded-control bg-warning-soft p-4 font-semibold text-pretty text-warning-ink">
        Guarda estos códigos fuera de la aplicación. Si pierdes tu teléfono, cada uno te deja entrar
        una sola vez. No los volverás a ver.
      </p>
      <ul
        className="grid grid-cols-2 gap-2 font-mono text-base tabular-nums"
        aria-label="Códigos de recuperación"
      >
        {codes.map((code) => (
          <li key={code} className="rounded-control bg-surface-muted px-3 py-2 text-center">
            {code}
          </li>
        ))}
      </ul>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="secondary" onClick={() => void copy()}>
          <AppIcon name={copied ? 'check' : 'copy'} size={18} />
          {copied ? 'Copiados' : 'Copiar todos'}
        </Button>
        <a
          className={cn(buttonStyles({ variant: 'secondary' }))}
          href={href}
          download={`lou-codigos-recuperacion-${userName}.txt`}
        >
          <AppIcon name="download" size={18} />
          Descargar
        </a>
      </div>
      <label className="flex min-h-12 items-center gap-3 rounded-control border border-line px-4 font-semibold">
        <input
          type="checkbox"
          className="size-5 accent-ink"
          checked={saved}
          onChange={(event) => onSavedChange(event.target.checked)}
        />
        Ya guardé mis códigos
      </label>
    </div>
  )
}
