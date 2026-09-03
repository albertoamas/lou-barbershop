export interface UserSummary {
  id: string
  userName: string
  active: boolean
  roles: string[]
}
export interface StaffProfile {
  id: string
  userId: string
  displayName: string
  phone?: string
  active: boolean
  version: number
}
export interface BarberProfile {
  id: string
  staffProfileId: string
  employmentType: 'OWNER' | 'CONTRACTOR'
  settlementFrequency: 'BIWEEKLY' | 'MONTHLY'
  color?: string
  active: boolean
  version: number
}
export interface Service {
  id: string
  name: string
  description?: string
  defaultDurationMinutes: number
  defaultPriceCents: number
  active: boolean
  version: number
}
export interface Offering {
  id: string
  barberId: string
  serviceId: string
  durationMinutes: number
  priceCents: number
  validFrom: string
  validTo?: string
  active: boolean
  version: number
}
export interface Product {
  id: string
  name: string
  brand?: string
  sku?: string
  description?: string
  salePriceCents: number
  averageCostCents: number
  minimumStock: number
  active: boolean
  version: number
}
export interface CommissionRule {
  id: string
  barberId: string
  kind: 'SERVICE' | 'PRODUCT'
  rateBasisPoints: number
  validFrom: string
  validTo?: string
  active: boolean
  version: number
}
export interface ExpenseCategory {
  id: string
  name: string
  active: boolean
  version: number
}

export interface ConfigurationSnapshot {
  users: UserSummary[]
  staff: StaffProfile[]
  barbers: BarberProfile[]
  services: Service[]
  products: Product[]
  expenseCategories: ExpenseCategory[]
}

export interface ConfigurationPort {
  load(): Promise<ConfigurationSnapshot>
  listOfferings(barberId: string): Promise<Offering[]>
  listCommissionRules(barberId: string): Promise<CommissionRule[]>
  createStaff(input: { userId: string; displayName: string; phone?: string }): Promise<StaffProfile>
  updateStaff(staff: StaffProfile, active: boolean): Promise<StaffProfile>
  createBarber(input: {
    staffProfileId: string
    employmentType: string
    settlementFrequency: string
    color?: string
  }): Promise<BarberProfile>
  updateBarber(barber: BarberProfile, active: boolean): Promise<BarberProfile>
  createService(input: {
    name: string
    description?: string
    defaultDurationMinutes: number
    defaultPriceCents: number
  }): Promise<Service>
  updateService(service: Service, active: boolean): Promise<Service>
  createOffering(
    barberId: string,
    input: {
      serviceId: string
      durationMinutes: number
      priceCents: number
      validFrom: string
      validTo?: string
    },
  ): Promise<Offering>
  deactivateOffering(offering: Offering): Promise<void>
  createProduct(input: {
    name: string
    brand?: string
    sku?: string
    salePriceCents: number
    minimumStock: number
  }): Promise<Product>
  updateProduct(product: Product, active: boolean): Promise<Product>
  createCommissionRule(
    barberId: string,
    input: { kind: string; rateBasisPoints: number; validFrom: string; validTo?: string },
  ): Promise<CommissionRule>
  deactivateCommissionRule(rule: CommissionRule): Promise<void>
  createExpenseCategory(name: string): Promise<ExpenseCategory>
  updateExpenseCategory(category: ExpenseCategory, active: boolean): Promise<ExpenseCategory>
}

export const bolivianosToCents = (value: string): number | null => {
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(value.trim())) return null
  const [whole, decimal = ''] = value.trim().replace(',', '.').split('.')
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'))
  return Number.isSafeInteger(cents) ? cents : null
}

export const centsToBolivianos = (cents: number) =>
  new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(cents / 100)
