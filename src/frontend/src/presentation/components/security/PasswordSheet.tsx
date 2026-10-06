import { useState, type FormEvent } from 'react'
import { passwordChecks, passwordIsStrong } from '../../../core/auth/Security'
import { cn } from '../../styles/cn'
import { errorClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { SheetHeader } from '../SheetHeader'
import { PasswordField } from './PasswordField'

export const PasswordSheet = ({
  busy,
  online,
  error,
  onClose,
  onSave,
}: {
  busy: boolean
  online: boolean
  error: string
  onClose: () => void
  onSave: (currentPassword: string, newPassword: string) => void
}) => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const checks = passwordChecks(next)
  const matches = repeat.length > 0 && next === repeat
  const ready = current.length > 0 && passwordIsStrong(next) && matches

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ready) onSave(current, next)
  }

  return (
    <>
      <SheetHeader title="Cambiar contraseña" busy={busy} onClose={onClose}>
        <p className="mt-1 text-pretty text-ink-soft">
          Al cambiarla se cierra la sesión en tus otros dispositivos.
        </p>
      </SheetHeader>
      <form className="grid gap-5" onSubmit={submit}>
        <PasswordField
          id="current-password"
          label="Contraseña actual"
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          required
        />
        <div className="grid gap-3">
          <PasswordField
            id="new-password"
            label="Nueva contraseña"
            autoComplete="new-password"
            aria-describedby="password-rules"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            required
          />
          <ul id="password-rules" className="grid gap-1" aria-label="Requisitos de la contraseña">
            {checks.map((check) => (
              <li
                key={check.id}
                className={cn(
                  'flex items-center gap-2',
                  check.met ? 'text-success-ink' : 'text-ink-soft',
                )}
              >
                <AppIcon name={check.met ? 'check' : 'minus'} size={16} />
                {check.label}
                <span className="sr-only">{check.met ? ', cumplido' : ', pendiente'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-2">
          <PasswordField
            id="repeat-password"
            label="Repite la nueva contraseña"
            autoComplete="new-password"
            aria-describedby={repeat ? 'repeat-status' : undefined}
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            required
          />
          {repeat && (
            <p
              id="repeat-status"
              className={cn(
                'flex items-center gap-2 font-semibold',
                matches ? 'text-success-ink' : 'text-danger-ink',
              )}
            >
              <AppIcon name={matches ? 'check' : 'close'} size={16} />
              {matches ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.'}
            </p>
          )}
        </div>
        {error && (
          <p className={errorClassName} role="alert">
            {error}
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={busy || !online || !ready}>
            {busy ? 'Guardando' : 'Cambiar contraseña'}
          </Button>
        </div>
      </form>
    </>
  )
}
