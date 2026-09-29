import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { LoginPage } from './LoginPage'

const LocationProbe = () => {
  const location = useLocation()
  return (
    <p>
      {location.pathname}
      {location.search}
    </p>
  )
}

vi.mock('../../infrastructure/http/authApi', () => ({
  authApi: {
    login: vi.fn(),
  },
}))

const renderLogin = (
  initialEntry: string | { pathname: string; state?: unknown } = '/app/login',
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/app/login" element={<LoginPage />} />
          <Route path="/app" element={<p>Inicio interno</p>} />
          <Route path="/app/agenda" element={<p>Agenda interna</p>} />
          <Route path="/app/reportes" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.resetAllMocks()
})

describe('LoginPage', () => {
  it('shows and hides the password without changing its value', async () => {
    const user = userEvent.setup()
    renderLogin()

    const password = screen.getByLabelText('Contraseña')
    await user.type(password, 'Clave-local!8426')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('Clave-local!8426')

    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('returns to the originally requested internal route after login', async () => {
    vi.mocked(authApi.login).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin({ pathname: '/app/login', state: { from: '/app/agenda' } })

    await user.type(screen.getByLabelText('Usuario'), 'admin.demo')
    await user.type(screen.getByLabelText('Contraseña'), 'Clave-local!8426')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('Agenda interna')).toBeInTheDocument()
    expect(authApi.login).toHaveBeenCalledWith('admin.demo', 'Clave-local!8426', undefined)
  })

  it('retains report filters after signing back in', async () => {
    vi.mocked(authApi.login).mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderLogin({ pathname: '/app/login', state: { from: '/app/reportes?vista=cash' } })

    await user.type(screen.getByLabelText('Usuario'), 'owner.demo')
    await user.type(screen.getByLabelText('Contraseña'), 'Clave-local!8426')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByText('/app/reportes?vista=cash')).toBeInTheDocument()
  })

  it('explains rate limiting without changing the form layout', async () => {
    vi.mocked(authApi.login).mockRejectedValue(
      new ApiError({ status: 429, title: 'Demasiadas solicitudes.' }),
    )
    const user = userEvent.setup()
    renderLogin()

    await user.type(screen.getByLabelText('Usuario'), 'owner.demo')
    await user.type(screen.getByLabelText('Contraseña'), 'Clave-incorrecta!8426')
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Demasiados intentos. Espera unos minutos antes de volver a intentar.',
    )
    expect(screen.getByLabelText('Usuario')).toHaveValue('owner.demo')
  })
})
