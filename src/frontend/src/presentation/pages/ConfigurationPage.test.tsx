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

  it('gathers everything about a person in one file', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Diego/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Ficha de la persona' })
    expect(within(sheet).getByRole('heading', { name: 'Diego' })).toBeInTheDocument()
    expect(within(sheet).getByText('diego.demo')).toBeInTheDocument()
    expect(within(sheet).getByText('Contratado, genera comisión')).toBeInTheDocument()
    expect(await within(sheet).findByText('Bs 65,00')).toBeInTheDocument()
    expect(within(sheet).getByText('45 min, desde el 1 sept 2026')).toBeInTheDocument()
    expect(await within(sheet).findByText('Sin comisión vigente.')).toBeInTheDocument()
    expect(configurationApi.listCommissionRules).toHaveBeenCalledWith('barber-diego')
  })

  it('tells the owner that their own work does not earn commission', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Alex/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Ficha de la persona' })
    expect(within(sheet).getByText('Dueño y barbero')).toBeInTheDocument()
    expect(
      within(sheet).getByText('El dueño no genera comisión por lo que atiende.'),
    ).toBeInTheDocument()
    expect(within(sheet).queryByRole('button', { name: 'Nueva comisión' })).not.toBeInTheDocument()
    expect(configurationApi.listCommissionRules).not.toHaveBeenCalled()
  })

  it('asks before removing a price and returns to the person', async () => {
    vi.mocked(configurationApi.deactivateOffering).mockResolvedValue(undefined)
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: /Diego/ }))
    await userEvent.click(await screen.findByRole('button', { name: 'Quitar precio de Corte' }))
    expect(configurationApi.deactivateOffering).not.toHaveBeenCalled()
    expect(screen.getByText(/Las citas ya agendadas no cambian/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quitar precio' }))
    expect(configurationApi.deactivateOffering).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'offering-1' }),
    )
    expect(await screen.findByRole('heading', { name: 'Diego' })).toBeInTheDocument()
  })

  it('edits a service with a comma price and deactivates it only after confirming', async () => {
    renderPage('/app/configuracion?seccion=servicios')
    await userEvent.click(await screen.findByRole('button', { name: /Corte/ }))
    const sheet = await screen.findByRole('dialog', { name: 'Editar servicio' })
    expect(within(sheet).getByLabelText('Precio por defecto en Bs')).toHaveValue('60,00')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Desactivar servicio' }))
    expect(configurationApi.updateService).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar servicio' }))
    expect(configurationApi.updateService).toHaveBeenCalledWith(snapshot.services[0], false)
    expect(screen.getByTestId('location')).toHaveTextContent('seccion=servicios')
  })

  it('offers to create an access account when every account already has a person', async () => {
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Agregar persona' }))
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta de acceso' }))
    const sheet = screen.getByRole('dialog', { name: 'Nueva cuenta de acceso' })
    expect(within(sheet).getByLabelText('Contraseña inicial')).toHaveAttribute('type', 'password')
    expect(within(sheet).getByRole('checkbox', { name: 'Barbero' })).toBeChecked()
    await userEvent.type(within(sheet).getByLabelText('Usuario'), 'nueva.cuenta')
    await userEvent.type(within(sheet).getByLabelText('Contraseña inicial'), 'Clave-demo!8426')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Guardar' }))
    expect(configurationApi.createUser).toHaveBeenCalledWith({
      userName: 'nueva.cuenta',
      password: 'Clave-demo!8426',
      roles: ['BARBER'],
    })
    expect(await screen.findByRole('dialog', { name: 'Agregar persona' })).toBeInTheDocument()
  })
})
