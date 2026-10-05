import { useState, type ReactNode } from 'react'
import {
  rateAsPercent,
  settlementItemsSummary,
  settlementStatusLabel,
  signedBolivianosToCents,
  type Settlement,
} from '../../../core/commissions/Commissions'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import type { PaymentMethod } from '../../../core/sales/Sales'
import { cn } from '../../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { MethodToggle } from '../MethodToggle'
import { StatusBadge } from '../StatusBadge'
import { methodWord, periodText, settlementTone, shortDate } from './commissionText'

const steps = ['Borrador', 'Cerrada', 'Pagada']
const stepIndex = { DRAFT: 0, CLOSED: 1, PAID: 2 } as const

const Progress = ({ value }: { value: Settlement }) => {
  const active = stepIndex[value.status]
  return (
    <ol
      className="grid grid-cols-3 gap-2"
      aria-label={`Estado: ${settlementStatusLabel(value.status)}`}
    >
      {steps.map((label, index) => (
        <li key={label} aria-current={index === active ? 'step' : undefined} className="grid gap-2">
          <span
            className={cn('h-1.5 rounded-full', index <= active ? 'bg-ink' : 'bg-surface-strong')}
          />
          <span
            className={cn(
              'flex items-center gap-1 text-sm',
              index === active ? 'font-bold' : 'text-ink-soft',
            )}
          >
            {index < active && <AppIcon name="check" size={14} />}
            {label}
          </span>
        </li>
      ))}
    </ol>
  )
}

// Keeps the next step reachable at the bottom of a long settlement.
const StickyActions = ({ children }: { children: ReactNode }) => (
  <div className="sticky bottom-0 z-10 -mx-5 -mb-5 grid gap-3 border-t border-line bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-7 sm:-mb-7 sm:px-7">
    {children}
  </div>
)

export const SettlementSheet = ({
  settlement,
  isOwner,
  online,
  busy,
  error,
  onClose,
  onAdjust,
  onCloseSettlement,
  onPay,
}: {
  settlement: Settlement
  isOwner: boolean
  online: boolean
  busy: boolean
  error: string
  onClose: () => void
  onAdjust: (amountCents: number, reason: string) => Promise<boolean>
  onCloseSettlement: () => void
  onPay: (method: PaymentMethod) => void
}) => {
  const [adjusting, setAdjusting] = useState(false)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const [confirming, setConfirming] = useState(false)
  const amountCents = signedBolivianosToCents(amount)
  const total = centsToBolivianos(settlement.payableTotalCents)
  const disabled = !online || busy

  const saveAdjustment = async () => {
    if (amountCents === null || !reason.trim()) return
    if (await onAdjust(amountCents, reason.trim())) {
      setAmount('')
      setReason('')
      setAdjusting(false)
    }
  }

  return (
    <div className="grid gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-3xl font-extrabold text-balance">
            Liquidación de {settlement.barberName}
          </h2>
          <p className="mt-1 text-ink-soft">
            {periodText(settlement.periodStart, settlement.periodEnd)}
          </p>
        </div>
        <Button
          variant="ghost"
          className="-mt-1 -mr-2 size-12 shrink-0 px-0"
          aria-label="Cerrar"
          disabled={busy}
          onClick={onClose}
        >
          <AppIcon name="close" />
        </Button>
      </div>

      <Progress value={settlement} />

      <div className="grid gap-2 rounded-control bg-surface-muted p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-semibold">Total a pagar</span>
          <StatusBadge tone={settlementTone[settlement.status]}>
            {settlementStatusLabel(settlement.status)}
          </StatusBadge>
        </div>
        <p className="font-display text-5xl leading-none font-extrabold tabular-nums">{total}</p>
        {settlement.adjustmentTotalCents !== 0 && (
          <dl className="mt-2 grid gap-1 border-t border-line pt-3 text-ink-soft">
            <div className="flex justify-between gap-3">
              <dt>Comisiones</dt>
              <dd className="tabular-nums">{centsToBolivianos(settlement.commissionTotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Ajustes</dt>
              <dd className="tabular-nums">{centsToBolivianos(settlement.adjustmentTotalCents)}</dd>
            </div>
          </dl>
        )}
      </div>

      {settlement.status === 'PAID' && (
        <p className="rounded-control bg-success-soft p-4 font-semibold text-success-ink">
          Pagada
          {settlement.paymentDate ? ` el ${shortDate(settlement.paymentDate)}` : ''} en{' '}
          {methodWord(settlement.paymentMethod)}. Ya no se puede modificar.
        </p>
      )}
      {!isOwner && settlement.status === 'CLOSED' && (
        <p className="rounded-control bg-info-soft p-4 font-semibold text-info-ink">
          Lista para pagar. El dueño registrará el pago de {total}.
        </p>
      )}
      {!isOwner && settlement.status === 'DRAFT' && (
        <p className="rounded-control bg-warning-soft p-4 font-semibold text-warning-ink">
          En revisión. El importe todavía puede cambiar.
        </p>
      )}

      <details className="group rounded-control border border-line">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 px-4 py-3 font-semibold">
          <span>{settlementItemsSummary(settlement.items)} incluidas</span>
          <span className="transition-transform duration-150 group-open:rotate-180">
            <AppIcon name="chevron-down" size={18} />
          </span>
        </summary>
        <ul className="divide-y divide-surface-strong border-t border-line px-4">
          {settlement.items.map((item) => (
            <li key={item.id} className="flex items-baseline justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block font-semibold">
                  {item.type === 'REVERSAL' ? `Corrección: ${item.description}` : item.description}
                </span>
                <span className="block text-ink-soft">
                  {rateAsPercent(item.rateBasisPoints)} de {centsToBolivianos(item.baseCents)}
                </span>
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {centsToBolivianos(item.amountCents)}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {settlement.adjustments.length > 0 && (
        <section aria-labelledby="settlement-adjustments">
          <h3 id="settlement-adjustments" className="mb-2 font-display text-xl font-extrabold">
            Ajustes
          </h3>
          <ul className="grid gap-2">
            {settlement.adjustments.map((item) => (
              <li
                key={item.id}
                className="flex items-baseline justify-between gap-3 rounded-control bg-surface-muted px-4 py-3"
              >
                <span className="min-w-0">{item.reason}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {centsToBolivianos(item.amountCents)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isOwner && settlement.status === 'DRAFT' && (
        <section aria-label="Ajuste">
          {adjusting ? (
            <div className="grid gap-4 rounded-control border border-line p-4">
              <h3 className="font-display text-xl font-extrabold">Agregar ajuste</h3>
              <p className="text-ink-soft">
                Usa un signo menos para descontar, por ejemplo -10. El motivo queda registrado.
              </p>
              <label className={labelClassName}>
                Importe en Bs
                <input
                  className={fieldClassName}
                  name="adjustment-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Por ejemplo -10 o 5,50"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </label>
              {amount && amountCents === null && (
                <p className={errorClassName} role="alert">
                  Escribe un importe distinto de cero con hasta dos decimales.
                </p>
              )}
              <label className={labelClassName}>
                Motivo
                <input
                  className={fieldClassName}
                  name="adjustment-reason"
                  maxLength={300}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" disabled={busy} onClick={() => setAdjusting(false)}>
                  Cancelar
                </Button>
                <Button
                  variant="secondary"
                  disabled={disabled || amountCents === null || !reason.trim()}
                  onClick={() => void saveAdjustment()}
                >
                  Guardar ajuste
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" disabled={disabled} onClick={() => setAdjusting(true)}>
              <AppIcon name="plus" size={20} />
              Agregar ajuste
            </Button>
          )}
        </section>
      )}

      {error && (
        <p className={errorClassName} role="alert">
          {error}
        </p>
      )}

      {isOwner && settlement.status === 'DRAFT' && (
        <StickyActions>
          <p className="text-ink-soft">
            Al cerrarla queda lista para pagar y ya no admite ajustes.
          </p>
          <Button width="full" disabled={disabled} onClick={onCloseSettlement}>
            {busy ? 'Cerrando' : 'Cerrar liquidación'}
          </Button>
        </StickyActions>
      )}

      {isOwner && settlement.status === 'CLOSED' && (
        <StickyActions>
          {confirming ? (
            <>
              <p className="font-semibold text-pretty">
                ¿Ya entregaste {total} a {settlement.barberName} en {methodWord(method)}?
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
                  Volver
                </Button>
                <Button variant="money" disabled={disabled} onClick={() => onPay(method)}>
                  {busy ? 'Registrando' : 'Sí, registrar pago'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <fieldset className="grid gap-2">
                <legend className="mb-2 font-semibold">Cómo le pagas</legend>
                <MethodToggle value={method} onChange={setMethod} />
              </fieldset>
              <Button
                variant="money"
                width="full"
                disabled={disabled}
                onClick={() => setConfirming(true)}
              >
                Registrar pago de {total}
              </Button>
            </>
          )}
        </StickyActions>
      )}
    </div>
  )
}
