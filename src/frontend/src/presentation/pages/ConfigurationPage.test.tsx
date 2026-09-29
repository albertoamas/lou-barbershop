import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConfigurationSnapshot } from '../../core/configuration/Configuration'
import { authApi } from '../../infrastructure/http/authApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { MotionProvider } from '../components/MotionProvider'
import { ConfigurationPage } from './ConfigurationPage'

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../../infrastructure/http/configurationApi', () => ({
  configurationApi: {
    load: vi.fn(),
    listOfferings: vi.fn(),
    listCommissionRules: vi.fn(),
    createUser: vi.fn(),
    setUserActive: vi.fn(),
    replaceUserRoles: vi.fn(),
    resetUserPassword: vi.fn(),
    createStaff: vi.fn(),
    updateStaff: vi.fn(),
    createBarber: vi.fn(),
    updateBarber: vi.fn(),
    createService: vi.fn(),
    updateService: vi.fn(),
    createOffering: vi.fn(),
    deactivateOffering: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    createCommissionRule: vi.fn(),
    deactivateCommissionRule: vi.fn(),
    createExpenseCategory: vi.fn(),
    updateExpenseCategory: vi.fn(),
  },
}))

const snapshot: ConfigurationSnapshot = {
  users: [
    { id: 'owner', userName: 'owner.demo', active: true, roles: ['OWNER', 'BARBER'] },
    { id: 'staff-user', userName: 'diego.demo', active: true, roles: ['BARBER'] },
  ],
  staff: [
    { id: 'staff-owner', userId: 'owner', displayName: 'Alex', active: true, version: 1 },
    { id: 'staff-diego', userId: 'staff-user', displayName: 'Diego', active: true, version: 1 },
  ],
  barbers: [
    {
      id: 'barber-owner',
      staffProfileId: 'staff-owner',
      employmentType: 'OWNER',
      settlementFrequency: 'BIWEEKLY',
      active: true,
      version: 1,
    },
    {
      id: 'barber-diego',
      staffProfileId: 'staff-diego',
      employmentType: 'CONTRACTOR',
      settlementFrequency: 'BIWEEKLY',
      active: true,
      version: 1,
    },
  ],
  services: [
    {
      id: 'service-1',
      name: 'Corte',
      defaultDurationMinutes: 45,
      defaultPriceCents: 6000,
      active: true,
      version: 1,
    },
  ],
  products: [
    {
      id: 'product-1',
      name: 'Cera',
      salePriceCents: 3000,
      averageCostCents: 1500,
      minimumStock: 2,
      active: true,
      version: 1,
    },
  ],
  expenseCategories: [{ id: 'expense-1', name: 'Servicios', active: true, version: 1 }],
}
const LocationProbe = () => <span data-testid="location">{useLocation().search}</span>
const renderPage = (initial = '/app/configuracion') =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[initial]}>
        <MotionProvider>
          <Routes>
            <Route
              path="/app/configuracion"
              element={
                <>
                  <ConfigurationPage />
                  <LocationProbe />
                </>
              }
            />
            <Route path="/app/acceso-denegado" element={<p>Acceso restringido</p>} />
          </Routes>
        </MotionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
  vi.mocked(authApi.current).mockResolvedValue({
    id: 'owner',
    userName: 'owner.demo',
    roles: ['OWNER'],
  })
  vi.mocked(configurationApi.load).mockResolvedValue(snapshot)
  vi.mocked(configurationApi.listOfferings).mockResolvedValue([
    {
      id: 'offering-1',
      barberId: 'barber-owner',
      serviceId: 'service-1',
      durationMinutes: 45,
      priceCents: 6500,
      validFrom: '2026-09-01',
      active: true,
      version: 1,
    },
  ])
  vi.mocked(configurationApi.listCommissionRules).mockResolvedValue([])
  vi.mocked(configurationApi.updateService).mockResolvedValue(snapshot.services[0]!)
  vi.mocked(configurationApi.createUser).mockResolvedValue(snapshot.users[0]!)
  vi.mocked(configurationApi.setUserActive).mockResolvedValue(undefined)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ConfigurationPage', () => {
  it('denies non-owners without requesting configuration', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'admin',
      userName: 'admin.demo',
      roles: ['ADMIN'],
    })
    renderPage()
    expect(await screen.findByText('Acceso restringido')).toBeInTheDocument()
    expect(configurationApi.load).not.toHaveBeenCalled()
  })

  it('keeps the secondary section in the URL and shows list/detail rather than open forms', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Configuración' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Servicios$/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('seccion=services')
    expect(screen.getByRole('heading', { name: 'Corte' })).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cambiar esta referencia no modifica reservas, atenciones ni precios históricos.',
      ),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Editar servicio' }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(screen.getByRole('dialog')).getByLabelText('Precio Bs')).toHaveValue('60.00')
  })

  it('separates deactivation from editing and requires confirmation', async () => {
    renderPage('/app/configuracion?seccion=services')
    expect(await screen.findByRole('heading', { name: 'Corte' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^Desactivar$/ }))
    expect(configurationApi.updateService).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar cambio' }))
    expect(configurationApi.updateService).toHaveBeenCalledWith(snapshot.services[0], false)
  })

  it('keeps commission creation disabled for the owner barber', async () => {
    renderPage('/app/configuracion?seccion=commissions')
    expect(
      await screen.findByText(
        'El dueño también atiende, pero su producción no genera deuda de comisión.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Crear' })).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Barbero'), 'barber-diego')
    expect(screen.getByRole('button', { name: 'Crear' })).toBeEnabled()
  })

  it('exposes user administration with a single creation panel', async () => {
    renderPage('/app/configuracion?seccion=users')
    expect(await screen.findByRole('heading', { name: 'owner.demo' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Crear' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText('Contraseña inicial')).toHaveAttribute('type', 'password')
    expect(within(dialog).getByRole('checkbox', { name: 'Barbero' })).toBeChecked()
    await userEvent.type(within(dialog).getByLabelText('Usuario'), 'nueva.cuenta')
    await userEvent.type(within(dialog).getByLabelText('Contraseña inicial'), 'Clave-demo!8426')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Guardar cambio' }))
    expect(configurationApi.createUser).toHaveBeenCalledWith({
      userName: 'nueva.cuenta',
      password: 'Clave-demo!8426',
      roles: ['BARBER'],
    })
  })
})
