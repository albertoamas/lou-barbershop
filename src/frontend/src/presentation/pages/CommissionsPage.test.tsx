import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CommissionEntry, Settlement } from '../../core/commissions/Commissions'
import { authApi } from '../../infrastructure/http/authApi'
import { commissionApi } from '../../infrastructure/http/commissionApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { MotionProvider } from '../components/MotionProvider'
import { CommissionsPage } from './CommissionsPage'

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../../infrastructure/http/commissionApi', () => ({
  commissionApi: {
    commissions: vi.fn(),
    settlements: vi.fn(),
    create: vi.fn(),
    adjust: vi.fn(),
    close: vi.fn(),
    pay: vi.fn(),
  },
}))
vi.mock('../../infrastructure/http/configurationApi', () => ({
  configurationApi: { load: vi.fn() },
}))

const entries: CommissionEntry[] = [
  {
    id: 'entry-1',
    barberId: 'barber-1',
    operationId: 'operation-123456',
    description: 'Corte clásico',
    type: 'EARNING',
    baseCents: 7_000,
    rateBasisPoints: 5_000,
    amountCents: 3_500,
    status: 'AVAILABLE',
    earnedAt: '2026-09-16T14:00:00Z',
  },
  {
    id: 'entry-2',
    barberId: 'barber-1',
    description: 'Barba',
    type: 'EARNING',
    baseCents: 4_000,
    rateBasisPoints: 5_000,
    amountCents: 2_000,
    status: 'PAID',
    earnedAt: '2026-09-15T14:00:00Z',
  },
]

const settlement: Settlement = {
  id: 'settlement-1',
  barberId: 'barber-1',
  barberName: 'Diego',
  periodStart: '2026-09-01',
  periodEnd: '2026-09-15',
  status: 'CLOSED',
  commissionTotalCents: 3_500,
  adjustmentTotalCents: 0,
  payableTotalCents: 3_500,
  closedAt: '2026-09-16T13:00:00Z',
  version: 2,
  items: [
    {
      id: 'item-1',
      commissionEntryId: 'entry-1',
      operationId: 'operation-123456',
      description: 'Corte clásico',
      baseCents: 7_000,
      rateBasisPoints: 5_000,
      amountCents: 3_500,
      type: 'EARNING',
    },
  ],
  adjustments: [],
}

const renderPage = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MotionProvider>
        <CommissionsPage />
      </MotionProvider>
    </QueryClientProvider>,
  )

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
  vi.mocked(commissionApi.commissions).mockResolvedValue(entries)
  vi.mocked(commissionApi.settlements).mockResolvedValue([settlement])
  vi.mocked(configurationApi.load).mockResolvedValue({
    users: [],
    staff: [
      {
        id: 'staff-1',
        userId: 'user-1',
        displayName: 'Diego',
        active: true,
        version: 1,
      },
    ],
    barbers: [
      {
        id: 'barber-1',
        staffProfileId: 'staff-1',
        employmentType: 'CONTRACTOR',
        settlementFrequency: 'BIWEEKLY',
        active: true,
        version: 1,
      },
    ],
    services: [],
    products: [],
    expenseCategories: [],
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('CommissionsPage', () => {
  it('shows the owner team scope and keeps commission debt separate from collected money', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'owner',
      userName: 'owner.demo',
      roles: ['OWNER', 'BARBER'],
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Comisiones' })).toBeInTheDocument()
    expect(screen.getByText('No forma parte del dinero cobrado')).toBeInTheDocument()
    expect(await screen.findByLabelText('Barbero')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nueva liquidación' })).toBeInTheDocument()
    expect(screen.getAllByText('Bs 35,00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Bs 20,00').length).toBeGreaterThan(0)
  })

  it('limits the barber view to personal data and never exposes settlement actions', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber-user',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Mis comisiones' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Barbero')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nueva liquidación' })).not.toBeInTheDocument()
    expect(configurationApi.load).not.toHaveBeenCalled()
    expect(commissionApi.commissions).toHaveBeenCalledWith(undefined, undefined)
  })

  it('opens a closed settlement with its timeline and payment control only for the owner', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'owner',
      userName: 'owner.demo',
      roles: ['OWNER'],
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /Diego/ }))
    expect(
      await screen.findByRole('dialog', { name: 'Detalle de liquidación' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Estado: Cerrada')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar pago de Bs\s*35,00/ })).toBeInTheDocument()
    expect(screen.getByText('No es efectivo o QR cobrado')).toBeInTheDocument()
  })
})
