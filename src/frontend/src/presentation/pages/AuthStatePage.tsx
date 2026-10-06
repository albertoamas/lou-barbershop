import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { internalReturnPath } from '../../core/auth/AuthSession'
import { roleLabel } from '../../core/configuration/Configuration'
import { authApi } from '../../infrastructure/http/authApi'
import { Button } from '../components/Button'
import { SystemStateCard } from '../components/SystemStateCard'
import { buttonStyles } from '../components/buttonStyles'

const DeniedPage = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })
  const [leaving, setLeaving] = useState(false)
  const account = session.data
  const switchAccount = async () => {
    setLeaving(true)
    try {
      await authApi.logout()
    } catch {
      // Already signed out or offline: the login screen is still the right place.
    }
    queryClient.removeQueries({ queryKey: ['auth'] })
    navigate('/app/login', { replace: true })
  }

  return (
    <SystemStateCard
      icon="shield"
      title="Esta sección no está disponible para tu cuenta"
      message={
        account ? (
          <>
            Entraste como <strong className="text-ink">{account.userName}</strong> (
            {account.roles.map(roleLabel).join(', ')}).
          </>
        ) : (
          'Tu cuenta no tiene permiso para ver esta sección.'
        )
      }
      note="Si necesitas entrar, pídele acceso al dueño."
      standalone
    >
      <Link className={buttonStyles({ variant: 'primary' })} to="/app">
        Volver a mi inicio
      </Link>
      <Button variant="secondary" disabled={leaving} onClick={() => void switchAccount()}>
        Usar otra cuenta
      </Button>
    </SystemStateCard>
  )
}

export const AuthStatePage = ({ kind }: { kind: 'expired' | 'denied' }) => {
  const location = useLocation()
  const requested = (location.state as { from?: unknown } | null)?.from
  const from = internalReturnPath(requested)
  const hasDestination = typeof requested === 'string' && from !== '/app'

  if (kind === 'denied') return <DeniedPage />
  return (
    <SystemStateCard
      icon="clock"
      title="Tu sesión se cerró"
      message={
        hasDestination
          ? 'Por seguridad, vuelve a ingresar. Te llevaremos a donde estabas.'
          : 'Por seguridad, vuelve a ingresar para seguir trabajando.'
      }
      note="Lo que no alcanzaste a guardar no se envió."
      standalone
    >
      <Link className={buttonStyles({ variant: 'primary' })} to="/app/login" state={{ from }}>
        Iniciar sesión
      </Link>
      <Link className={buttonStyles({ variant: 'secondary' })} to="/">
        Ir al sitio público
      </Link>
    </SystemStateCard>
  )
}
