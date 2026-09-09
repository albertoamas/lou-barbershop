import { Link } from 'react-router-dom'
import { useConnectivity } from '../hooks/useConnectivity'

export const FoundationPage = () => {
  const connectivity = useConnectivity()

  return (
    <main className="content">
      <p className="eyebrow">Lou · Operación local</p>
      <h1>Tu jornada comienza aquí.</h1>
      <p className="lead">
        Ya puedes gestionar la jornada completa: agenda, atención real, cobros, inventario, gastos,
        comisiones y liquidaciones, cada concepto con su propia trazabilidad.
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
            Servicios realizados, productos, cortesías y pagos mixtos sin confundirlos con la cita.
          </p>
          <Link to="/operations">Abrir atención</Link>
        </article>
        <article className="foundation-card">
          <span>03</span>
          <h2>Economía</h2>
          <p>Cobros, caja, comisiones y liquidaciones con trazabilidad independiente.</p>
          <Link to="/commissions">Abrir comisiones</Link>
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
