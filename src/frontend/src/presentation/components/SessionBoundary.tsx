import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { internalReturnPath } from '../../core/auth/AuthSession'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { InternalNavigation } from '../layout/InternalNavigation'
import { Button } from './Button'

interface SessionBoundaryProps {
  children?: ReactNode
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
        <div className="flex items-center gap-3 text-sm font-semibold text-ink-muted">
          <span className="size-2 animate-pulse rounded-full bg-accent" />
          Verificando sesión…
        </div>
      </main>
    )
  }

  const from = internalReturnPath(`${location.pathname}${location.search}${location.hash}`)
  if (session.error instanceof ApiError && session.error.problem.status === 401) {
    return <Navigate to="/app/sesion-expirada" replace state={{ from }} />
  }
  if (session.error instanceof ApiError && session.error.problem.status === 403) {
    return <Navigate to="/app/acceso-denegado" replace state={{ from }} />
  }
  if (session.isError && !session.data) {
    return (
      <main className="grid min-h-[65dvh] place-items-center px-4 py-10">
        <section className="w-full max-w-lg rounded-panel bg-surface p-7 shadow-raised">
          <h1 className="font-display text-3xl font-extrabold">No pudimos verificar tu sesión</h1>
          <p className="mt-3 leading-6 text-ink-muted">
            Revisa tu conexión y vuelve a intentarlo. No se enviará ninguna operación mientras no
            podamos confirmar el acceso.
          </p>
          <Button className="mt-5" onClick={() => void session.refetch()}>
            Reintentar
          </Button>
        </section>
      </main>
    )
  }
  if (!session.data) return <Navigate to="/app/sesion-expirada" replace state={{ from }} />
  if (
    session.data.mfaRequired &&
    !session.data.mfaEnabled &&
    location.pathname !== '/app/seguridad'
  ) {
    return <Navigate to="/app/seguridad" replace />
  }

  const logout = async () => {
    await authApi.logout()
    queryClient.clear()
    navigate('/app/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-canvas md:grid md:grid-cols-[8rem_minmax(0,1fr)] xl:grid-cols-[16rem_minmax(0,1fr)]">
      <InternalNavigation
        roles={session.data.roles}
        userName={session.data.userName}
        onLogout={logout}
      />
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={location.pathname}
          className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-0"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.16 }}
        >
          {children ?? <Outlet />}
        </m.div>
      </AnimatePresence>
    </div>
  )
}
