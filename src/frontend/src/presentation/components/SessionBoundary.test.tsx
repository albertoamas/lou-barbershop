import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom'
import { authApi } from '../../infrastructure/http/authApi'
import { SessionBoundary } from './SessionBoundary'

vi.mock('../../infrastructure/http/authApi', () => ({
  authApi: {
    current: vi.fn().mockResolvedValue({ id: 'admin-1', userName: 'lou.admin', roles: ['ADMIN'] }),
    logout: vi.fn(),
  },
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('SessionBoundary', () => {
  it('keeps the internal navigation mounted while only the route content changes', async () => {
    const user = userEvent.setup()
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/app/agenda']}>
          <Routes>
            <Route path="/app" element={<SessionBoundary />}>
              <Route index element={<p>Inicio</p>} />
              <Route path="agenda" element={<Link to="/app/atenciones">Ir a atención</Link>} />
              <Route path="atenciones" element={<p>Contenido de atención</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    const navigation = await screen.findByLabelText('Navegación principal')
    await user.click(screen.getByRole('link', { name: 'Ir a atención' }))

    expect(await screen.findByText('Contenido de atención')).toBeInTheDocument()
    expect(screen.getByLabelText('Navegación principal')).toBe(navigation)
    expect(authApi.current).toHaveBeenCalledTimes(1)
  })
})
