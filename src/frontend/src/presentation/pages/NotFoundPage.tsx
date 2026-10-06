import { Link, useLocation } from 'react-router-dom'
import { SystemStateCard } from '../components/SystemStateCard'
import { buttonStyles } from '../components/buttonStyles'

export const NotFoundPage = () => {
  const location = useLocation()
  const internal = location.pathname === '/app' || location.pathname.startsWith('/app/')
  return internal ? (
    <SystemStateCard
      icon="map-pin"
      title="No encontramos esta sección"
      message="Puede que el enlace esté mal escrito o que la sección ya no exista."
    >
      <Link className={buttonStyles({ variant: 'primary' })} to="/app">
        Volver a mi inicio
      </Link>
      <Link className={buttonStyles({ variant: 'secondary' })} to="/app/agenda">
        Ver agenda
      </Link>
    </SystemStateCard>
  ) : (
    <SystemStateCard
      icon="map-pin"
      title="No encontramos esta página"
      message="Puede que el enlace haya cambiado. Desde aquí puedes seguir."
    >
      <Link className={buttonStyles({ variant: 'primary' })} to="/">
        Ir al inicio
      </Link>
      <Link className={buttonStyles({ variant: 'secondary' })} to="/reservar">
        Reservar una cita
      </Link>
      <Link className={buttonStyles({ variant: 'ghost' })} to="/servicios">
        Ver servicios
      </Link>
    </SystemStateCard>
  )
}
