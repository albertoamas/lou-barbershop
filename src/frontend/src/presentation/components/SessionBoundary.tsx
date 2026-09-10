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
      <main className="grid min-h-[70vh] place-items-center px-4" aria-busy="true">
        <div className="flex items-center gap-3 text-sm font-semibold text-lou-graphite/70">
          <span className="size-2 animate-pulse rounded-full bg-lou-ink" />
          Verificando sesión…
        </div>
      </main>
    )
  }

  if (session.error instanceof ApiError) {
    const destination = session.error.problem.status === 403 ? '/app/acceso-denegado' : '/app/login'
    return <Navigate to={destination} replace state={{ from: location.pathname }} />
  }

  if (session.isError || !session.data) {
    return <Navigate to="/app/sesion-expirada" replace />
  }

  const logout = async () => {
    await authApi.logout()
    queryClient.clear()
    navigate('/app/login', { replace: true })
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[5rem_minmax(0,1fr)] lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      <InternalNavigation
        roles={session.data.roles}
        userName={session.data.userName}
        onLogout={logout}
      />
      <div className="min-w-0 pb-24 md:pb-0">{children}</div>
    </div>
  )
}
