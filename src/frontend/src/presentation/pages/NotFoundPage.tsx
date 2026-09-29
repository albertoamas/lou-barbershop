import { Link, useLocation } from 'react-router-dom'
import { SystemStateCard } from '../components/SystemStateCard'
import { buttonStyles } from '../components/buttonStyles'

export const NotFoundPage = () => {
  const location = useLocation()
  const internal = location.pathname === '/app' || location.pathname.startsWith('/app/')
  return (
    <SystemStateCard
      eyebrow="Página no encontrada"
      title="Este enlace no existe"
      message={
        internal
          ? 'La sección que buscas no está disponible. Vuelve a tu inicio para seguir trabajando.'
          : 'Puede que el enlace haya cambiado. Puedes volver al inicio o comenzar una reserva.'
      }
    >
      <Link className={buttonStyles({ variant: 'primary' })} to={internal ? '/app' : '/'}>
        {internal ? 'Volver a mi inicio' : 'Ir al inicio'}
      </Link>
      <Link
        className={buttonStyles({ variant: 'secondary' })}
        to={internal ? '/app/agenda' : '/reservar'}
      >
        {internal ? 'Ver agenda' : 'Reservar una cita'}
      </Link>
    </SystemStateCard>
  )
}
