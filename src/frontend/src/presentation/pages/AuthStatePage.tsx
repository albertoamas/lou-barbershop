import { Link } from 'react-router-dom'

export const AuthStatePage = ({ title, message }: { title: string; message: string }) => (
  <main className="auth-page">
    <section className="auth-card">
      <p className="eyebrow">Lou Barbershop</p>
      <h1>{title}</h1>
      <p className="lead">{message}</p>
      <Link to="/login">Volver al acceso</Link>
    </section>
  </main>
)
