import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'

export const LandingPage = () => {
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })

  return (
    <main className="landing-page">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="eyebrow">Estilo, detalle y oficio</p>
          <h1 id="landing-title">Tu estilo empieza en Lou.</h1>
          <p>
            Reserva tu próxima cita en pocos pasos. Elige el servicio, el profesional y el horario
            que mejor te quede.
          </p>
          <div className="landing-actions">
            <Link className="primary-button button-link" to="/reservar">
              Reservar una cita
            </Link>
            <Link className="secondary-button button-link" to="/mi-cita">
              Gestionar mi cita
            </Link>
          </div>
          <ul className="landing-trust" aria-label="Ventajas de reservar en línea">
            <li>Sin crear una cuenta</li>
            <li>Disponibilidad actualizada</li>
            <li>Enlace privado de gestión</li>
          </ul>
        </div>
        <div className="landing-emblem" aria-hidden="true">
          <img src="/brand/lou-logo.jpg" alt="" />
          <span>Lou Barbershop</span>
        </div>
      </section>

      <section className="landing-section" aria-labelledby="services-title">
        <div className="landing-section-heading">
          <div>
            <p className="eyebrow">Servicios</p>
            <h2 id="services-title">Elige tu próximo corte.</h2>
          </div>
          <Link to="/reservar">Ver horarios disponibles →</Link>
        </div>
        {catalog.isPending && <p aria-busy="true">Cargando servicios disponibles…</p>}
        {catalog.isError && (
          <div className="landing-notice" role="status">
            <strong>El catálogo no está disponible en este momento.</strong>
            <span>Puedes entrar a la reserva e intentarlo nuevamente.</span>
          </div>
        )}
        {catalog.data && (
          <div className="landing-services">
            {catalog.data.services.slice(0, 6).map((service, index) => (
              <article key={service.id}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{service.name}</h3>
                  {service.description && <p>{service.description}</p>}
                  <small>{service.durationMinutes} minutos</small>
                </div>
                <strong>{centsToBolivianos(service.priceCents)}</strong>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="landing-process" aria-labelledby="process-title">
        <div>
          <p className="eyebrow">Reserva simple</p>
          <h2 id="process-title">Tres pasos. Sin vueltas.</h2>
        </div>
        <ol>
          <li>
            <AppIcon name="scissors" size={26} />
            <span>
              <strong>Elige</strong>Servicio y profesional.
            </span>
          </li>
          <li>
            <AppIcon name="calendar" size={26} />
            <span>
              <strong>Encuentra</strong>Un horario disponible.
            </span>
          </li>
          <li>
            <AppIcon name="clock" size={26} />
            <span>
              <strong>Confirma</strong>Recibe tu enlace privado.
            </span>
          </li>
        </ol>
      </section>

      <section className="landing-cta" aria-labelledby="cta-title">
        <div>
          <p className="eyebrow">Lou Barbershop</p>
          <h2 id="cta-title">¿Listo para tu próximo estilo?</h2>
        </div>
        <Link className="primary-button button-link" to="/reservar">
          Reservar ahora
        </Link>
      </section>
    </main>
  )
}
