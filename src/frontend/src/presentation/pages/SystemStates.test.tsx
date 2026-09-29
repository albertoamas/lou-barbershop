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

vi.mock('../../infrastructure/http/authApi', () => ({ authApi: { current: vi.fn() } }))
vi.mock('../layout/InternalNavigation', () => ({ InternalNavigation: () => <nav>Interno</nav> }))

const LoginProbe = () => {
  const location = useLocation()
  return <p data-testid="return-path">{(location.state as { from?: string } | null)?.from}</p>
}

const renderRoute = (initial: string, element: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>,
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

    expect(await screen.findByRole('heading', { name: 'Vuelve a ingresar' })).toBeInTheDocument()
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
    expect(screen.queryByRole('heading', { name: 'Vuelve a ingresar' })).not.toBeInTheDocument()
  })

  it('gives a role-specific way out of access denied', () => {
    renderRoute('/app/acceso-denegado', <AuthStatePage kind="denied" />)
    expect(screen.getByRole('heading', { name: 'Acceso restringido' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a mi inicio' })).toHaveAttribute('href', '/app')
  })

  it('uses the correct destination on public and internal 404 pages', () => {
    const publicView = renderRoute('/direccion-inexistente', <NotFoundPage />)
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/')
    publicView.unmount()
    renderRoute('/app/direccion-inexistente', <NotFoundPage />)
    expect(screen.getByRole('link', { name: 'Volver a mi inicio' })).toHaveAttribute('href', '/app')
    expect(screen.getByRole('link', { name: 'Ver agenda' })).toHaveAttribute('href', '/app/agenda')
  })
})
