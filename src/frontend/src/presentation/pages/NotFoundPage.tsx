import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <main className="auth-page">
    <section className="auth-card">
      <p className="eyebrow">Página no encontrada</p>
      <h1>Este enlace no existe.</h1>
      <p>Vuelve al inicio o comienza una nueva reserva.</p>
      <Link className="primary-button button-link" to="/">
        Ir al inicio
      </Link>
      <Link to="/reservar">Reservar una cita</Link>
    </section>
  </main>
)
