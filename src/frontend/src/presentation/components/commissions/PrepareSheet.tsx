import { useState } from 'react'
import { cutoffPreview, type CommissionEntry } from '../../../core/commissions/Commissions'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { errorClassName, fieldClassName, labelClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { plural, shortDate } from './commissionText'

// Groups a barber's loose commissions up to a cutoff day into a draft settlement.
export const PrepareSheet = ({
  barbers,
  initialBarberId,
  entries,
  today,
  online,
  busy,
  error,
  onClose,
  onCreate,
}: {
  barbers: { id: string; name: string }[]
  initialBarberId: string
  entries: CommissionEntry[]
  today: string
  online: boolean
  busy: boolean
  error: string
  onClose: () => void
  onCreate: (barberId: string, cutoff: string) => void
}) => {
  const [barberId, setBarberId] = useState(initialBarberId)
  const [cutoff, setCutoff] = useState(today)
  const preview = barberId ? cutoffPreview(entries, barberId, cutoff) : undefined
  const name = barbers.find((barber) => barber.id === barberId)?.name

  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault()
        if (preview?.count) onCreate(barberId, cutoff)
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl font-extrabold text-balance">
            Preparar liquidación
          </h2>
          <p className="mt-1 text-pretty text-ink-soft">
            Se crea como borrador. Podrás revisarla antes de cerrarla y pagarla.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="-mt-1 -mr-2 size-12 shrink-0 px-0"
          aria-label="Cerrar"
          disabled={busy}
          onClick={onClose}
        >
          <AppIcon name="close" />
        </Button>
      </div>

      <label className={labelClassName}>
        Barbero
        <select
          className={fieldClassName}
          name="settlement-barber"
          value={barberId}
          onChange={(event) => setBarberId(event.target.value)}
        >
          <option value="">Elige un barbero</option>
          {barbers.map((barber) => (
            <option key={barber.id} value={barber.id}>
              {barber.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClassName}>
        Incluir comisiones hasta el
        <input
          className={fieldClassName}
          name="settlement-cutoff"
          type="date"
          max={today}
          required
          value={cutoff}
          onChange={(event) => event.target.value && setCutoff(event.target.value)}
        />
      </label>

      {preview && (
        <p
          className="rounded-control bg-surface-muted p-4 text-pretty"
          role="status"
          aria-live="polite"
        >
          {preview.count > 0 ? (
            <>
              Se incluirán <strong>{plural(preview.count, 'comisión', 'comisiones')}</strong> de{' '}
              {name} por{' '}
              <strong className="tabular-nums">{centsToBolivianos(preview.cents)}</strong>, hasta el{' '}
              {shortDate(cutoff)}.
            </>
          ) : (
            `${name ?? 'Este barbero'} no tiene comisiones sin liquidar hasta el ${shortDate(cutoff)}.`
          )}
        </p>
      )}

      {error && (
        <p className={errorClassName} role="alert">
          {error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!online || busy || !preview?.count}>
          {busy ? 'Creando' : 'Crear borrador'}
        </Button>
      </div>
    </form>
  )
}
