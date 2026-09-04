import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'

interface SessionBoundaryProps {
  children: ReactNode
}

export const SessionBoundary = ({ children }: SessionBoundaryProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })

  if (session.isPending) {
    return (
      <main className="auth-page" aria-busy="true">
        Verificando sesión…
      </main>
    )
  }

  if (session.error instanceof ApiError) {
    const destination = session.error.problem.status === 403 ? '/access-denied' : '/login'
    return <Navigate to={destination} replace state={{ from: location.pathname }} />
  }

  if (session.isError || !session.data) {
    return <Navigate to="/session-expired" replace />
  }

  const logout = async () => {
    await authApi.logout()
    queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <div className="session-bar" aria-label="Sesión actual">
        <nav aria-label="Navegación interna">
          <Link to="/">Inicio</Link>
          <Link to="/agenda">Agenda</Link>
          <Link to="/scheduling">Disponibilidad</Link>
          {session.data.roles.includes('OWNER') && <Link to="/configuration">Configuración</Link>}
        </nav>
        <span>
          Sesión: <strong>{session.data.userName}</strong>
        </span>
        <button type="button" onClick={logout}>
          Cerrar sesión
        </button>
      </div>
      {children}
    </>
  )
}
