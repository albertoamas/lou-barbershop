import { useState } from 'react'
import { bolivianosToCents, centsToBolivianos } from '../../../core/configuration/Configuration'
import {
  cashChange,
  paymentSplit,
  type Operation,
  type PaymentChoice,
  type PaymentMethod,
} from '../../../core/sales/Sales'
import { cn } from '../../styles/cn'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  noticeClassName,
  warningClassName,
} from '../../styles/formStyles'
import { AppIcon, type IconName } from '../AppIcon'
import { Button } from '../Button'
import { ActionBar } from './ActionBar'
import { OperationTicket } from './OperationTicket'

interface CheckoutStepProps {
  operation: Operation
  canAdjust: boolean
  busy: boolean
  disabled: boolean
  error: string
  // Present while the consumption can still change (the operation is a draft).
  onBack?: (() => void) | undefined
  onAdjust: (discountCents: number, courtesy: boolean, reason: string) => void
  onCharge: (payments: { method: PaymentMethod; amountCents: number }[]) => void
}

const choices: { value: PaymentChoice; label: string; hint: string; icon: IconName }[] = [
  { value: 'CASH', label: 'Efectivo', hint: 'Billetes o monedas', icon: 'cash' },
  { value: 'QR', label: 'QR', hint: 'Pago con el celular', icon: 'qr' },
  { value: 'MIXED', label: 'Mixto', hint: 'Parte y parte', icon: 'wallet' },
]

const moneyFieldClassName = cn(fieldClassName, 'font-display text-2xl font-extrabold tabular-nums')

export const CheckoutStep = ({
  operation,
  canAdjust,
  busy,
  disabled,
  error,
  onBack,
  onAdjust,
  onCharge,
}: CheckoutStepProps) => {
  const [choice, setChoice] = useState<PaymentChoice>()
  const [received, setReceived] = useState('')
  const [mixedCash, setMixedCash] = useState('')
  const [discount, setDiscount] = useState('')
  const [courtesy, setCourtesy] = useState(false)
  const [reason, setReason] = useState('')

  const total = operation.totalCents
  const mixedCents = bolivianosToCents(mixedCash) ?? 0
  const split = choice ? paymentSplit(choice, total, mixedCents) : undefined
  const mixedValid = choice !== 'MIXED' || (mixedCents > 0 && mixedCents < total)
  const ready = total === 0 || (split !== undefined && mixedValid)
  const receivedCents = received.trim() ? bolivianosToCents(received) : null
  const change =
    split && split.cash > 0 && receivedCents !== null
      ? cashChange(split.cash, receivedCents)
      : undefined
  const discountCents = discount.trim() ? bolivianosToCents(discount) : 0
  const canApply =
    discountCents !== null && (discountCents > 0 || courtesy) && reason.trim().length > 0

  const charge = () => {
    if (!ready) return
    onCharge(
      split
        ? [
            ...(split.cash > 0 ? [{ method: 'CASH' as const, amountCents: split.cash }] : []),
            ...(split.qr > 0 ? [{ method: 'QR' as const, amountCents: split.qr }] : []),
          ]
        : [],
    )
  }

  return (
    <div className="grid gap-8">
      <div className="grid gap-2">
        <OperationTicket operation={operation} />
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            className="justify-self-start"
            disabled={busy}
            onClick={onBack}
          >
            <AppIcon name="arrow-left" size={18} />
            Corregir consumo
          </Button>
        )}
      </div>

      {operation.status === 'DRAFT' && canAdjust && (
        <details className="group rounded-panel border-2 border-line">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-panel px-5 font-semibold hover:bg-surface-muted">
            Aplicar descuento o cortesía
            <span className="transition-transform duration-150 group-open:rotate-180">
              <AppIcon name="chevron-down" size={20} />
            </span>
          </summary>
          <div className="grid gap-4 px-5 pt-1 pb-5 sm:grid-cols-2">
            <label className={labelClassName}>
              Descuento en Bs
              <input
                className={fieldClassName}
                name="discount"
                inputMode="decimal"
                autoComplete="off"
                value={discount}
                disabled={courtesy}
                onChange={(event) => setDiscount(event.target.value)}
                placeholder="0,00"
              />
            </label>
            <label className="flex min-h-12 items-center gap-3 self-end rounded-control border border-line-control px-4 font-semibold">
              <input
                className="size-5 accent-ink"
                type="checkbox"
                checked={courtesy}
                onChange={(event) => setCourtesy(event.target.checked)}
              />
              Cortesía, no se cobra
            </label>
            <label className={cn(labelClassName, 'sm:col-span-2')}>
              Motivo
              <input
                className={fieldClassName}
                name="adjustment-reason"
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Por ejemplo, cliente frecuente"
              />
            </label>
            {discountCents === null && (
              <p className={cn(warningClassName, 'sm:col-span-2')}>
                Escribe el descuento como 10 o 10,50.
              </p>
            )}
            <Button
              variant="secondary"
              className="sm:col-span-2"
              disabled={disabled || busy || !canApply}
              onClick={() => onAdjust(courtesy ? 0 : (discountCents ?? 0), courtesy, reason.trim())}
            >
              Aplicar ajuste
            </Button>
          </div>
        </details>
      )}

      {total > 0 ? (
        <section aria-labelledby="payment-method">
          <h3 id="payment-method" className="font-display text-2xl font-extrabold">
            ¿Cómo pagó?
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Medio de pago">
            {choices.map((item) => {
              const active = choice === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  className={cn(
                    'flex min-h-24 flex-col items-center justify-center gap-1 rounded-control border-2 px-2 py-3 text-center transition-colors duration-150',
                    active
                      ? 'border-ink bg-ink text-on-ink'
                      : 'border-line bg-surface hover:border-line-control',
                  )}
                  aria-pressed={active}
                  onClick={() => setChoice(item.value)}
                >
                  <AppIcon name={item.icon} size={24} />
                  <span className="font-semibold">{item.label}</span>
                  <span className={cn('text-sm', active ? 'text-on-ink-muted' : 'text-ink-soft')}>
                    {item.hint}
                  </span>
                </button>
              )
            })}
          </div>

          {choice === 'CASH' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-end">
              <label className={labelClassName}>
                ¿Cuánto entregó? Opcional, para calcular el vuelto
                <input
                  className={moneyFieldClassName}
                  name="received"
                  inputMode="decimal"
                  autoComplete="off"
                  value={received}
                  onChange={(event) => setReceived(event.target.value)}
                  placeholder="0,00"
                />
              </label>
              <ChangeMessage
                change={change}
                invalid={received.trim() !== '' && receivedCents === null}
              />
            </div>
          )}
          {choice === 'QR' && (
            <p className={cn(noticeClassName, 'mt-4')}>
              Confirma el cobro cuando veas llegar el pago de {centsToBolivianos(total)} en el
              celular de la barbería.
            </p>
          )}
          {choice === 'MIXED' && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 sm:items-end">
              <label className={labelClassName}>
                Parte en efectivo
                <input
                  className={moneyFieldClassName}
                  name="mixed-cash"
                  inputMode="decimal"
                  autoComplete="off"
                  value={mixedCash}
                  onChange={(event) => setMixedCash(event.target.value)}
                  placeholder="0,00"
                />
              </label>
              {mixedValid && split ? (
                <p className="rounded-control bg-surface-muted p-4">
                  <span className="block text-sm text-ink-soft">Por QR</span>
                  <span className="font-display text-2xl font-extrabold tabular-nums">
                    {centsToBolivianos(split.qr)}
                  </span>
                </p>
              ) : (
                <p className={warningClassName}>
                  El efectivo debe ser mayor que cero y menor que {centsToBolivianos(total)}.
                </p>
              )}
            </div>
          )}
        </section>
      ) : (
        <p className={noticeClassName}>Cortesía total: no entra efectivo ni QR.</p>
      )}

      <ActionBar>
        {error && (
          <p className={errorClassName} role="alert">
            {error}
          </p>
        )}
        {!ready && <p className="text-ink-soft">Elige cómo pagó para continuar.</p>}
        <div className="grid sm:flex sm:justify-end">
          <Button variant="money" size="lg" disabled={disabled || busy || !ready} onClick={charge}>
            {busy
              ? 'Registrando...'
              : total === 0
                ? 'Cerrar cortesía'
                : `Cobrar ${centsToBolivianos(total)}`}
          </Button>
        </div>
      </ActionBar>
    </div>
  )
}

const ChangeMessage = ({ change, invalid }: { change: number | undefined; invalid: boolean }) => {
  if (invalid) return <p className={warningClassName}>Escribe el monto como 100 o 100,50.</p>
  if (change === undefined) return null
  if (change < 0)
    return <p className={warningClassName}>Faltan {centsToBolivianos(-change)} en efectivo.</p>
  return (
    <p className="rounded-control bg-success-soft p-4 text-success-ink" aria-live="polite">
      <span className="block text-sm font-semibold">{change === 0 ? 'Monto justo' : 'Vuelto'}</span>
      <span className="font-display text-3xl leading-none font-extrabold tabular-nums">
        {centsToBolivianos(change)}
      </span>
    </p>
  )
}
