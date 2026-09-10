import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { authApi } from '../../infrastructure/http/authApi'
import { useConnectivity } from '../hooks/useConnectivity'
import { AppIcon } from '../components/AppIcon'

export const FoundationPage = () => {
  const connectivity = useConnectivity()
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const isOwner = session.data?.roles.includes('OWNER') === true
  const isAdmin = session.data?.roles.includes('ADMIN') === true
  const economyDestination = isOwner
    ? '/app/reportes'
    : isAdmin
      ? '/app/inventario'
      : '/app/comisiones'
  const economyLabel = isOwner
    ? 'Ver reportes'
    : isAdmin
      ? 'Abrir inventario y caja'
      : 'Ver mis comisiones'
  const economyDescription = isOwner
    ? 'Cobros, caja, comisiones y liquidaciones, siempre separados.'
    : isAdmin
      ? 'Inventario, compras, gastos y caja operativa.'
      : 'Consulta tus comisiones y liquidaciones sin mezclarlas con los cobros.'

  return (
    <main className="content dashboard-page">
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">Lou · Operación local</p>
          <h1>Tu jornada comienza aquí.</h1>
          <p className="lead">
            Agenda, atención y economía conectadas, cada una con su propia trazabilidad.
          </p>
        </div>
        <span className={`connection-status ${connectivity}`}>
          <i />
          {connectivity === 'online' ? 'Sistema conectado' : 'Sin conexión'}
        </span>
      </header>

      <section className="foundation-grid" aria-label="Acciones principales">
        <article className="foundation-card">
          <span>
            <AppIcon name="calendar" size={28} />
          </span>
          <h2>Agenda</h2>
          <p>Revisa las citas, llegadas y cambios de hoy.</p>
          <Link to="/app/agenda">Abrir agenda</Link>
        </article>
        <article className="foundation-card">
          <span>
            <AppIcon name="scissors" size={28} />
          </span>
          <h2>Atención</h2>
          <p>Registra servicios, productos, cortesías y pagos mixtos.</p>
          <Link to="/app/atenciones">Iniciar atención</Link>
        </article>
        <article className="foundation-card">
          <span>
            <AppIcon name="chart" size={28} />
          </span>
          <h2>{isOwner ? 'Economía' : isAdmin ? 'Inventario y caja' : 'Mis comisiones'}</h2>
          <p>{economyDescription}</p>
          <Link to={economyDestination}>{economyLabel}</Link>
        </article>
      </section>

      <section className="protected-action" aria-label="Estado de conexión">
        <div>
          <strong>Agenda con confirmación en línea</strong>
          <p>
            {connectivity === 'online'
              ? 'Con conexión. Puedes confirmar y cambiar citas.'
              : 'Sin conexión. Los cambios quedan bloqueados hasta recuperarla.'}
          </p>
        </div>
        <Link to="/app/disponibilidad">Consultar disponibilidad</Link>
      </section>
    </main>
  )
}
