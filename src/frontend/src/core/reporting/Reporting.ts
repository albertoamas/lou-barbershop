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

export const basisPointsToPercent = (value: number) => `${(value / 100).toFixed(2)} %`
