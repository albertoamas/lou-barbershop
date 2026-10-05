import { addCalendarDays } from '../scheduling/Scheduling'

export interface DailyAppointment {
  id: string
  customerName: string
  barberName: string
  serviceName: string
  status: string
  startsAt: string
}
export interface DailyOperation {
  id: string
  customerName: string
  barberName: string
  status: string
  totalCents: number
  openedAt: string
}
export interface DailyDashboard {
  date: string
  appointmentCount: number
  appointmentsByStatus: Record<string, number>
  paidOperationCount: number
  chargesCents: number
  cashCollectedCents: number
  qrCollectedCents: number
  appointments: DailyAppointment[]
  operations: DailyOperation[]
}
export interface OperationReportSource {
  id: string
  date: string
  barberName: string
  customerName: string
  serviceQuantity: number
  serviceRevenueCents: number
  productQuantity: number
  productRevenueCents: number
  productCostCents: number
  cashCents: number
  qrCents: number
  totalCents: number
}
export interface CommissionReportSource {
  id: string
  date: string
  barberId: string
  barberName: string
  status: string
  amountCents: number
}
export interface InventoryPurchaseReportSource {
  id: string
  date: string
  method: 'CASH' | 'QR'
  amountCents: number
}
export interface ExpenseReportSource {
  id: string
  date: string
  category: string
  description: string
  method: 'CASH' | 'QR'
  amountCents: number
}
export interface SettlementReportSource {
  id: string
  date: string
  barberName: string
  method: 'CASH' | 'QR'
  amountCents: number
}
export interface PeriodReport {
  dateFrom: string
  dateTo: string
  paidOperationCount: number
  serviceRevenueCents: number
  productRevenueCents: number
  productCostCents: number
  averageTicketCents: number
  cashCollectedCents: number
  qrCollectedCents: number
  commissionGeneratedCents: number
  commissionAvailableCents: number
  commissionSettledCents: number
  commissionPaidCents: number
  commissionPaymentsCents: number
  expenseCents: number
  inventoryPurchaseCents: number
  approximateOperatingResultCents: number
  cashFlowCents: number
  cashFlowCashCents: number
  cashFlowQrCents: number
  operations: OperationReportSource[]
  commissions: CommissionReportSource[]
  expenses: ExpenseReportSource[]
  inventoryPurchases: InventoryPurchaseReportSource[]
  settlementPayments: SettlementReportSource[]
}
export interface BarberPerformance {
  barberId: string
  barberName: string
  isOwner: boolean
  services: number
  products: number
  revenueCents: number
  productiveMinutes: number
  scheduledMinutes: number
  occupancyBasisPoints: number
}
export interface AuditLog {
  id: string
  actorUserId?: string
  actorName?: string
  action: string
  entityType: string
  entityId: string
  beforeData?: string
  afterData?: string
  requestId?: string
  createdAt: string
}
export interface AuditPage {
  total: number
  page: number
  pageSize: number
  items: AuditLog[]
}

// "25,8 %": one decimal at most, Spanish decimal comma.
export const basisPointsToPercent = (value: number) =>
  `${new Intl.NumberFormat('es-BO', { maximumFractionDigits: 1 }).format(value / 100)} %`

export const paymentReportLabel = (method: 'CASH' | 'QR') => (method === 'CASH' ? 'Efectivo' : 'QR')

// Period presets

export type PeriodPreset = 'today' | 'week' | 'month' | 'lastMonth'

const dayOfWeek = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay()
const monthStart = (date: string) => `${date.slice(0, 8)}01`
const monthEnd = (date: string) =>
  addCalendarDays(monthStart(addCalendarDays(monthStart(date), 32)), -1)
export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000)

export const presetRange = (preset: PeriodPreset, today: string) => {
  if (preset === 'today') return { from: today, to: today }
  if (preset === 'week')
    return { from: addCalendarDays(today, -((dayOfWeek(today) + 6) % 7)), to: today }
  if (preset === 'month') return { from: monthStart(today), to: today }
  const last = addCalendarDays(monthStart(today), -1)
  return { from: monthStart(last), to: last }
}

export type ComparisonKind = 'day' | 'week' | 'month' | 'period'

// The stretch to compare against: the same days of the previous day, week or month for
// those presets, otherwise the same number of days right before the range.
export const comparisonRange = (
  from: string,
  to: string,
  preset?: PeriodPreset,
): { from: string; to: string; kind: ComparisonKind } => {
  if (preset === 'today' || (!preset && from === to))
    return { from: addCalendarDays(from, -1), to: addCalendarDays(to, -1), kind: 'day' }
  if (preset === 'week')
    return { from: addCalendarDays(from, -7), to: addCalendarDays(to, -7), kind: 'week' }
  if (preset === 'month' || preset === 'lastMonth') {
    const previousStart = monthStart(addCalendarDays(from, -1))
    const previousEnd = monthEnd(previousStart)
    const end =
      to === monthEnd(to) || Number(to.slice(8)) > Number(previousEnd.slice(8))
        ? previousEnd
        : `${previousStart.slice(0, 8)}${to.slice(8)}`
    return { from: previousStart, to: end, kind: 'month' }
  }
  const length = daysBetween(from, to) + 1
  return { from: addCalendarDays(from, -length), to: addCalendarDays(from, -1), kind: 'period' }
}

// Whole percent change, or null when there is nothing to compare with.
export const percentChange = (current: number, previous: number) =>
  previous === 0 ? null : Math.round(((current - previous) / Math.abs(previous)) * 100)

// Sales chart

export type SeriesGrain = 'day' | 'week' | 'month'

export interface SeriesBucket {
  from: string
  to: string
  totalCents: number
  count: number
}

// Paid sales per day up to a month, per week up to three months and per month beyond.
export const salesSeries = (operations: OperationReportSource[], from: string, to: string) => {
  const days = daysBetween(from, to) + 1
  const grain: SeriesGrain = days <= 31 ? 'day' : days <= 92 ? 'week' : 'month'
  const buckets: SeriesBucket[] = []
  let start = from
  while (start <= to) {
    const natural =
      grain === 'day' ? start : grain === 'week' ? addCalendarDays(start, 6) : monthEnd(start)
    const end = natural > to ? to : natural
    const rows = operations.filter((row) => row.date >= start && row.date <= end)
    buckets.push({
      from: start,
      to: end,
      totalCents: rows.reduce((sum, row) => sum + row.totalCents, 0),
      count: rows.length,
    })
    start = addCalendarDays(end, 1)
  }
  return { grain, buckets }
}

// Result

// Mirrors the backend: sales minus cost of products sold, commissions earned and expenses.
export const resultLines = (period: PeriodReport) => ({
  salesCents: period.serviceRevenueCents + period.productRevenueCents,
  productCostCents: period.productCostCents,
  commissionCents: period.commissionGeneratedCents,
  expenseCents: period.expenseCents,
  resultCents: period.approximateOperatingResultCents,
})

export const largestExpense = (expenses: ExpenseReportSource[]) =>
  expenses.reduce<ExpenseReportSource | undefined>(
    (largest, row) => (!largest || row.amountCents > largest.amountCents ? row : largest),
    undefined,
  )

export interface CashOutflow {
  id: string
  date: string
  label: string
  method: 'CASH' | 'QR'
  amountCents: number
}

// Every outflow of the period as one list, newest first.
export const cashOutflows = (period: PeriodReport): CashOutflow[] =>
  [
    ...period.inventoryPurchases.map((row) => ({ ...row, label: 'Compra de productos' })),
    ...period.expenses.map((row) => ({
      ...row,
      label: row.description ? `${row.category}: ${row.description}` : row.category,
    })),
    ...period.settlementPayments.map((row) => ({ ...row, label: `Pago a ${row.barberName}` })),
  ]
    .map(({ id, date, label, method, amountCents }) => ({ id, date, label, method, amountCents }))
    .sort((a, b) => b.date.localeCompare(a.date))

// Activity log

export const activityFilters = [
  ['', 'Todo'],
  ['appointment', 'Citas'],
  ['sale_operation', 'Atenciones'],
  ['settlement', 'Liquidaciones'],
  ['expense', 'Gastos'],
  ['customer', 'Clientes'],
] as const

const entityNouns: Record<string, string> = {
  appointment: 'una cita',
  sale_operation: 'una atención',
  settlement: 'una liquidación',
  customer: 'los datos de un cliente',
  expense: 'un gasto',
  staff_profile: 'un perfil del equipo',
  barber_profile: 'un perfil de barbero',
  service: 'un servicio',
  barber_service_offering: 'el precio de un servicio de un barbero',
  product: 'un producto',
  commission_rule: 'una regla de comisión',
  expense_category: 'una categoría de gasto',
  working_schedule: 'un horario de trabajo',
  availability_exception: 'una ausencia',
}

// Numeric statuses as the backend stores them (see the Domain enums).
const statusVerbs: Record<string, Record<number, string>> = {
  appointment: {
    1: 'marcó la llegada de un cliente',
    2: 'empezó a atender una cita',
    3: 'completó una cita',
    4: 'canceló una cita',
    5: 'marcó una cita como no asistida',
  },
  sale_operation: {
    1: 'pasó una atención a cobro',
    2: 'cobró una atención',
    3: 'anuló una atención',
    4: 'revirtió una atención cobrada',
  },
  settlement: {
    1: 'cerró una liquidación',
    2: 'registró el pago de una liquidación',
    3: 'canceló una liquidación',
  },
}

const addedVerbs: Record<string, string> = {
  appointment: 'agendó una cita',
  sale_operation: 'abrió una atención',
  settlement: 'preparó una liquidación',
  customer: 'registró un cliente nuevo',
  expense: 'registró un gasto',
}

const readStatus = (json: string | undefined) => {
  if (!json) return undefined
  try {
    const value = (JSON.parse(json) as { Status?: unknown }).Status
    return typeof value === 'number' ? value : undefined
  } catch {
    return undefined
  }
}

// Who did what, in plain Spanish. Changes without a staff actor come from online booking.
export const activitySentence = (log: AuditLog) => {
  const before = readStatus(log.beforeData)
  const after = readStatus(log.afterData)
  const noun = entityNouns[log.entityType] ?? 'un registro'
  let what =
    log.action === 'Added'
      ? (addedVerbs[log.entityType] ?? `creó ${noun}`)
      : log.action === 'Deleted'
        ? `eliminó ${noun}`
        : `modificó ${noun}`
  if (log.action === 'Modified' && after !== undefined && after !== before)
    what = statusVerbs[log.entityType]?.[after] ?? what
  if (log.actorName) return { who: log.actorName, what }
  const online = log.entityType === 'appointment' || log.entityType === 'customer'
  return { who: online ? 'Reserva en línea' : 'Sistema', what }
}
