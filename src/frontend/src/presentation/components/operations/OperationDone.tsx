import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Operation } from '../../../core/sales/Sales'
import { cn } from '../../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { buttonStyles } from '../buttonStyles'
import { OperationTicket } from './OperationTicket'
import { paymentsText } from './operationText'

interface OperationDoneProps {
  operation: Operation
  canReverse: boolean
  busy: boolean
  disabled: boolean
  error: string
  onNext: () => void
  onReverse: (reason: string) => void
}

// Last step: the charge is recorded. The next customer is the obvious action; the
// owner's reversal stays tucked away so it is never tapped by mistake.
export const OperationDone = ({
  operation,
  canReverse,
  busy,
  disabled,
  error,
  onNext,
  onReverse,
}: OperationDoneProps) => {
  const [reason, setReason] = useState('')
  const reversed = operation.status === 'REVERSED'

  return (
    <div className="grid gap-6">
      <div
        className={cn(
          'flex items-center gap-4 rounded-panel p-5',
          reversed ? 'bg-danger-soft text-danger-ink' : 'bg-success-soft text-success-ink',
        )}
        role="status"
      >
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full text-on-ink',
            reversed ? 'bg-danger' : 'bg-success',
          )}
        >
          <AppIcon name={reversed ? 'close' : 'check'} size={24} />
        </span>
        <span>
          <span className="block font-display text-3xl leading-tight font-extrabold">
            {reversed ? 'Cobro revertido' : 'Cobro registrado'}
          </span>
          <span className="block">
            {reversed
              ? `Motivo: ${operation.reversalReason ?? 'sin motivo registrado'}. La caja, el inventario y la comisión se corrigieron sin borrar el historial.`
              : paymentsText(operation.payments)}
          </span>
        </span>
      </div>

      <OperationTicket operation={operation} />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="lg" className="sm:flex-1" onClick={onNext}>
          Atender al siguiente
        </Button>
        <Link
          className={cn(buttonStyles({ variant: 'secondary', size: 'lg' }), 'sm:flex-1')}
          to="/app/agenda"
        >
          Ir a la agenda
        </Link>
      </div>

      {canReverse && !reversed && (
        <details className="group rounded-panel border-2 border-line">
          <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-panel px-5 font-semibold hover:bg-surface-muted">
            Más opciones
            <span className="transition-transform duration-150 group-open:rotate-180">
              <AppIcon name="chevron-down" size={20} />
            </span>
          </summary>
          <form
            className="grid gap-3 px-5 pt-1 pb-5"
            onSubmit={(event) => {
              event.preventDefault()
              if (reason.trim()) onReverse(reason.trim())
            }}
          >
            <p className="text-ink-soft">
              Revertir no borra el cobro: registra una corrección y conserva el historial. Solo
              hazlo si el cobro fue un error.
            </p>
            <label className={labelClassName}>
              Motivo del reverso
              <textarea
                className={cn(fieldClassName, 'min-h-24 py-3')}
                name="reversal-reason"
                required
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            {error && (
              <p className={errorClassName} role="alert">
                {error}
              </p>
            )}
            <Button type="submit" variant="danger" disabled={disabled || busy || !reason.trim()}>
              {busy ? 'Revirtiendo...' : 'Revertir cobro'}
            </Button>
          </form>
        </details>
      )}
    </div>
  )
}
