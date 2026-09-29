import { Link, useLocation } from 'react-router-dom'
import { internalReturnPath } from '../../core/auth/AuthSession'
import { SystemStateCard } from '../components/SystemStateCard'
import { buttonStyles } from '../components/buttonStyles'

export const AuthStatePage = ({ kind }: { kind: 'expired' | 'denied' }) => {
  const location = useLocation()
  const requested = (location.state as { from?: unknown } | null)?.from
  const from = internalReturnPath(requested)
  const hasDestination = typeof requested === 'string' && from !== '/app'

  return kind === 'expired' ? (
    <SystemStateCard
      eyebrow="Acceso interno"
      title="Vuelve a ingresar"
      message={
        hasDestination
          ? 'Tu sesión ya no está disponible. Ingresa otra vez y continuaremos en la pantalla que estabas consultando. Los cambios que no alcanzaste a guardar no se enviaron.'
          : 'Tu sesión ya no está disponible. Ingresa otra vez para volver al inicio de tu equipo. Los cambios que no alcanzaste a guardar no se enviaron.'
      }
      fullHeight
    >
      <Link className={buttonStyles({ variant: 'primary' })} to="/app/login" state={{ from }}>
        Iniciar sesión
      </Link>
      <Link className={buttonStyles({ variant: 'secondary' })} to="/">
        Ir al sitio público
      </Link>
    </SystemStateCard>
  ) : (
    <SystemStateCard
      eyebrow="Permisos de tu cuenta"
      title="Acceso restringido"
      message="Tu rol no tiene permiso para ver esta sección. Puedes volver al inicio de tu equipo o consultar al dueño si necesitas acceso."
      fullHeight
    >
      <Link className={buttonStyles({ variant: 'primary' })} to="/app">
        Volver a mi inicio
      </Link>
      <Link className={buttonStyles({ variant: 'secondary' })} to="/">
        Ir al sitio público
      </Link>
    </SystemStateCard>
  )
}
