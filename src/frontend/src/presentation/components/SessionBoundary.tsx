import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { InternalNavigation } from '../layout/InternalNavigation'

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
    <div className="authenticated-layout">
      <InternalNavigation
        roles={session.data.roles}
        userName={session.data.userName}
        onLogout={logout}
      />
      <div className="authenticated-main">{children}</div>
    </div>
  )
}
