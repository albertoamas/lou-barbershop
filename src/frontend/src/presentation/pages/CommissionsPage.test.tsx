import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
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

const owner = () =>
  vi.mocked(authApi.current).mockResolvedValue({
    id: 'owner',
    userName: 'owner.demo',
    roles: ['OWNER', 'BARBER'],
  })

describe('CommissionsPage', () => {
  it('tells the owner what is owed to each barber and the next step', async () => {
    owner()
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Comisiones' })).toBeInTheDocument()
    expect(
      await screen.findByText('Debes Bs 70,00 a 1 barbero. 1 liquidación está lista para pagar.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Diego' })).toBeInTheDocument()
    expect(screen.getByText(/Bs 35,00 sin liquidar, 1 comisión/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pago de Diego' })).toBeInTheDocument()
  })

  it('lists movements by day with plain rates and filters by state', async () => {
    owner()
    renderPage()

    await userEvent.click(await screen.findByRole('tab', { name: 'Movimientos' }))
    expect(screen.getByText(/50 % de Bs 70,00/)).toBeInTheDocument()
    expect(screen.queryByText(/operation-/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Pagadas/ }))
    expect(screen.queryByText('Corte clásico')).not.toBeInTheDocument()
    expect(screen.getByText('Barba')).toBeInTheDocument()
  })

  it('previews what a new settlement will include before creating it', async () => {
    owner()
    vi.mocked(commissionApi.create).mockResolvedValue({ ...settlement, status: 'DRAFT' })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: /^Preparar liquidación$/ }))
    const dialog = await screen.findByRole('dialog', { name: 'Preparar liquidación' })
    expect(within(dialog).getByRole('button', { name: 'Crear borrador' })).toBeDisabled()
    await userEvent.selectOptions(within(dialog).getByLabelText('Barbero'), 'barber-1')
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      /Se incluirán 1 comisión de Diego por Bs\s*35,00/,
    )
    await userEvent.click(within(dialog).getByRole('button', { name: 'Crear borrador' }))
    expect(commissionApi.create).toHaveBeenCalledWith('barber-1', expect.any(String))
    expect(
      await screen.findByRole('dialog', { name: 'Detalle de liquidación' }),
    ).toBeInTheDocument()
  })

  it('asks for confirmation before recording a payment', async () => {
    owner()
    vi.mocked(commissionApi.pay).mockResolvedValue({
      ...settlement,
      status: 'PAID',
      paymentMethod: 'QR',
      paymentDate: '2026-09-16',
    })
    renderPage()

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar pago de Diego' }))
    const dialog = await screen.findByRole('dialog', { name: 'Detalle de liquidación' })
    expect(within(dialog).getByLabelText('Estado: Cerrada')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('radio', { name: 'QR' }))
    await userEvent.click(within(dialog).getByRole('button', { name: /Registrar pago de Bs/ }))
    expect(commissionApi.pay).not.toHaveBeenCalled()
    expect(within(dialog).getByText(/Ya entregaste Bs\s*35,00 a Diego en QR/)).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Sí, registrar pago' }))
    expect(commissionApi.pay).toHaveBeenCalledWith(settlement, expect.any(String), 'QR')
    expect(await screen.findByText(/Pagada el 16 sept 2026 en QR/)).toBeInTheDocument()
  })

  it('limits the barber view to personal data and never exposes settlement actions', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'barber-user',
      userName: 'barber.diego',
      roles: ['BARBER'],
    })
    renderPage()

    expect(await screen.findByRole('heading', { name: 'Mis comisiones' })).toBeInTheDocument()
    expect(await screen.findByText('Bs 70,00')).toBeInTheDocument()
    expect(screen.getByText('Tu pago de Bs 35,00 está listo.')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Por pagar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Preparar liquidación/ })).not.toBeInTheDocument()
    expect(configurationApi.load).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Ver detalle' }))
    const dialog = await screen.findByRole('dialog', { name: 'Detalle de liquidación' })
    expect(within(dialog).getByText(/El dueño registrará el pago/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: /Registrar pago/ })).not.toBeInTheDocument()
  })
})
