import { Link } from 'react-router-dom'
import { useConnectivity } from '../hooks/useConnectivity'

export const FoundationPage = () => {
  const connectivity = useConnectivity()

  return (
    <main className="content">
      <p className="eyebrow">Lou · Operación local</p>
      <h1>Tu jornada comienza aquí.</h1>
      <p className="lead">
        Ya puedes consultar horarios, registrar clientes y gestionar citas. Atención, cobros y
        comisiones se incorporarán en las próximas fases, separados de lo reservado.
      </p>

      <section className="foundation-grid" aria-label="Principios de la aplicación">
        <article className="foundation-card">
          <span>01</span>
          <h2>Agenda</h2>
          <p>Clientes, reservas, reprogramaciones y llegadas.</p>
          <Link to="/agenda">Abrir agenda</Link>
        </article>
        <article className="foundation-card">
          <span>02</span>
          <h2>Atención</h2>
          <p>
            Pendiente: servicios realizados y cobro. Iniciar una cita aún no registra una venta.
          </p>
        </article>
        <article className="foundation-card">
          <span>03</span>
          <h2>Economía</h2>
          <p>Pendiente: cobros, comisiones y liquidaciones con trazabilidad independiente.</p>
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
        <Link to="/scheduling">Consultar disponibilidad</Link>
      </section>
    </main>
  )
}
