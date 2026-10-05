import type {
  CommissionEntryStatus,
  NextSettlementAction,
  SettlementStatus,
} from '../../../core/commissions/Commissions'
import type { PaymentMethod } from '../../../core/sales/Sales'

const dayMonth = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
})
const dayMonthYear = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const atNoon = (date: string) => new Date(`${date}T12:00:00Z`)
const clean = (text: string) => text.replace(/\./g, '')

export const shortDate = (date: string) => clean(dayMonthYear.format(atNoon(date)))

// "19 sept a 2 oct 2026"; the year only once when both ends share it.
export const periodText = (start: string, end: string) =>
  start.slice(0, 4) === end.slice(0, 4)
    ? `${clean(dayMonth.format(atNoon(start)))} a ${shortDate(end)}`
    : `${shortDate(start)} a ${shortDate(end)}`

export const dayHeading = (date: string, today: string) => {
  if (date === today) return 'Hoy'
  const text = new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(atNoon(date))
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))

export const methodWord = (method: PaymentMethod | undefined) =>
  method === 'QR' ? 'QR' : 'efectivo'

export const settlementTone: Record<SettlementStatus, 'warning' | 'info' | 'success'> = {
  DRAFT: 'warning',
  CLOSED: 'info',
  PAID: 'success',
}

export const commissionTone: Record<
  CommissionEntryStatus,
  'warning' | 'info' | 'success' | 'muted'
> = {
  AVAILABLE: 'warning',
  SETTLED: 'info',
  PAID: 'success',
  VOIDED: 'muted',
}

export const nextActionLabel: Record<Exclude<NextSettlementAction, 'none'>, string> = {
  prepare: 'Preparar liquidación',
  review: 'Revisar borrador',
  pay: 'Registrar pago',
}

export const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`
