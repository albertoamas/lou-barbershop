import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { MotionProvider } from '../components/MotionProvider'
import { SessionBoundary } from '../components/SessionBoundary'
import { AuthStatePage } from './AuthStatePage'
import { NotFoundPage } from './NotFoundPage'

vi.mock('../../infrastructure/http/authApi', () => ({
  authApi: { current: vi.fn(), logout: vi.fn() },
}))
vi.mock('../layout/InternalNavigation', () => ({ InternalNavigation: () => <nav>Interno</nav> }))

const LoginProbe = () => {
  const location = useLocation()
  return <p data-testid="return-path">{(location.state as { from?: string } | null)?.from}</p>
}

const renderRoute = (initial: string, element: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="*" element={element} />
          <Route path="/app/login" element={<p>Pantalla de ingreso</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
const renderSession = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter initialEntries={['/app/reportes?vista=cash']}>
        <MotionProvider>
          <Routes>
            <Route path="/app" element={<SessionBoundary />}>
              <Route path="reportes" element={<p>Informe</p>} />
            </Route>
            <Route path="/app/sesion-expirada" element={<AuthStatePage kind="expired" />} />
            <Route path="/app/login" element={<LoginProbe />} />
          </Routes>
        </MotionProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

describe('system routes', () => {
  it('explains an expired session and carries the original destination to login', async () => {
    vi.mocked(authApi.current).mockRejectedValue(
      new ApiError({ status: 401, title: 'Unauthorized' }),
    )
    renderSession()

    expect(await screen.findByRole('heading', { name: 'Tu sesión se cerró' })).toBeInTheDocument()
    expect(screen.getByText('Lo que no alcanzaste a guardar no se envió.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Iniciar sesión' }))
    expect(screen.getByTestId('return-path')).toHaveTextContent('/app/reportes?vista=cash')
  })

  it('offers a retry instead of falsely claiming session expiration on network failure', async () => {
    vi.mocked(authApi.current).mockRejectedValue(new TypeError('Network unavailable'))
    renderSession()

    expect(
      await screen.findByRole('heading', { name: 'No pudimos verificar tu sesión' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tu sesión se cerró' })).not.toBeInTheDocument()
  })

  it('says which account was denied and lets the person switch accounts', async () => {
    vi.mocked(authApi.current).mockResolvedValue({
      id: 'diego',
      userName: 'barbero.diego',
      roles: ['BARBER'],
    })
    vi.mocked(authApi.logout).mockResolvedValue(undefined)
    renderRoute('/app/acceso-denegado', <AuthStatePage kind="denied" />)
    expect(
      screen.getByRole('heading', { name: 'Esta sección no está disponible para tu cuenta' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('barbero.diego')).toBeInTheDocument()
    expect(screen.getByText(/\(Barbero\)/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a mi inicio' })).toHaveAttribute('href', '/app')
    await userEvent.click(screen.getByRole('button', { name: 'Usar otra cuenta' }))
    expect(authApi.logout).toHaveBeenCalled()
    expect(await screen.findByText('Pantalla de ingreso')).toBeInTheDocument()
  })

  it('uses the correct destination on public and internal 404 pages', () => {
    const publicView = renderRoute('/direccion-inexistente', <NotFoundPage />)
    expect(screen.getByRole('heading', { name: 'No encontramos esta página' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Ver servicios' })).toHaveAttribute(
      'href',
      '/servicios',
    )
    publicView.unmount()
    renderRoute('/app/direccion-inexistente', <NotFoundPage />)
    expect(screen.getByRole('link', { name: 'Volver a mi inicio' })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: 'Ver agenda' })).toHaveAttribute('href', '/app/agenda')
  })
})
