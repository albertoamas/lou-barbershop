import { centsToBolivianos } from '../../../core/configuration/Configuration'
import type { Operation, OperationStatus, Payment } from '../../../core/sales/Sales'

// Badge tone per state: the label is always text, so color is never the only cue.
export const operationTone = {
  DRAFT: 'muted',
  READY_TO_PAY: 'info',
  PAID: 'success',
  REVERSED: 'danger',
} as const satisfies Record<OperationStatus, string>

export const originLabel = (operation: Pick<Operation, 'origin'>) =>
  operation.origin === 'WALK_IN' ? 'Sin cita' : 'Desde cita'

const methodLabel = (payment: Pick<Payment, 'method'>) =>
  payment.method === 'CASH' ? 'Efectivo' : 'QR'

// "Efectivo Bs 30,00 y QR Bs 40,00", written with words instead of symbols.
export const paymentsText = (payments: Pick<Payment, 'method' | 'amountCents'>[]) =>
  payments.length === 0
    ? 'Sin pago, cortesía'
    : payments
        .map((payment) => `${methodLabel(payment)} ${centsToBolivianos(payment.amountCents)}`)
        .join(' y ')
