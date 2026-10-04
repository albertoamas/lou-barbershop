import { useState } from 'react'
import type { Customer } from '../../../core/agenda/Agenda'
import type { AvailableBarber } from '../../../core/scheduling/Scheduling'
import { cn } from '../../styles/cn'
import { errorClassName } from '../../styles/formStyles'
import { Avatar } from '../Avatar'
import { Button } from '../Button'
import { CustomerPicker } from '../CustomerPicker'
import { ActionBar } from './ActionBar'

interface WalkInPanelProps {
  // Management chooses who attends; a barber always attends their own walk-ins.
  barbers: AvailableBarber[] | undefined
  ownBarber: { id: string; name: string } | undefined
  busy: boolean
  disabled: boolean
  error: string
  onCancel: () => void
  onOpen: (customerId: string, barberId: string) => void
}

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-12 items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1.5 font-semibold transition-colors duration-150',
    active
      ? 'border-ink bg-ink text-on-ink'
      : 'border-line bg-surface text-ink hover:border-line-control',
  )

export const WalkInPanel = ({
  barbers,
  ownBarber,
  busy,
  disabled,
  error,
  onCancel,
  onOpen,
}: WalkInPanelProps) => {
  const [customer, setCustomer] = useState<Customer>()
  const [barberId, setBarberId] = useState('')
  const effectiveBarber = ownBarber?.id ?? barberId

  return (
    <section
      className="rounded-panel bg-surface p-5 shadow-raised sm:p-6"
      aria-labelledby="walk-in"
    >
      <h2 id="walk-in" className="font-display text-3xl font-extrabold">
        Llegada sin cita
      </h2>
      <p className="mt-1 text-ink-soft">
        Para quien llegó sin reservar. Si tiene cita, ábrela desde la agenda.
      </p>

      <div className="mt-6 grid gap-8">
        <CustomerPicker
          title="¿Quién llegó?"
          selected={customer}
          onSelect={setCustomer}
          disabled={disabled}
        />

        <section className="grid gap-3" aria-labelledby="walk-in-barber">
          <h3 id="walk-in-barber" className="font-display text-2xl font-extrabold">
            ¿Quién lo atiende?
          </h3>
          {ownBarber ? (
            <p className="flex items-center gap-3 rounded-control bg-surface-muted p-4">
              <Avatar name={ownBarber.name} tone="ink" />
              <span>
                <span className="block font-semibold">{ownBarber.name}</span>
                <span className="block text-sm text-ink-soft">La atención queda a tu nombre.</span>
              </span>
            </p>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Barbero que atiende">
              {barbers?.map((barber) => {
                const active = barberId === barber.id
                return (
                  <button
                    key={barber.id}
                    type="button"
                    className={chipClassName(active)}
                    aria-pressed={active}
                    onClick={() => setBarberId(barber.id)}
                  >
                    <Avatar name={barber.displayName} size="sm" tone={active ? 'neutral' : 'ink'} />
                    {barber.displayName}
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>

      <ActionBar>
        {error && (
          <p className={errorClassName} role="alert">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {/* Phones go back with "Volver a la lista" above, keeping this bar short. */}
          <Button
            variant="secondary"
            size="lg"
            className="max-lg:hidden"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </Button>
          <Button
            size="lg"
            disabled={disabled || busy || !customer || !effectiveBarber}
            onClick={() => customer && onOpen(customer.id, effectiveBarber)}
          >
            {busy ? 'Abriendo...' : 'Empezar atención'}
          </Button>
        </div>
      </ActionBar>
    </section>
  )
}
