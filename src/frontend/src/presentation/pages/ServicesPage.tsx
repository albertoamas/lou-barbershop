import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { ServiceCatalog } from '../components/public/ServiceCatalog'
import { publicSite } from '../content/publicSite'
import { cn } from '../styles/cn'
import { warningClassName } from '../styles/formStyles'

// The full catalog on its own page, linkable from Instagram or WhatsApp: every service
// with price and duration, each one opening the booking already chosen.
export const ServicesPage = () => {
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })

  return (
    <main className="bg-paper-warm">
      <div className="mx-auto w-full max-w-360 px-4 py-10 sm:px-6 lg:px-10 lg:py-16">
        <header className="mb-8 max-w-2xl">
          <h1 className="font-display text-[clamp(3rem,10vw,5.5rem)] leading-[0.9] font-extrabold text-balance">
            Servicios y precios
          </h1>
          <p className="mt-4 text-xl text-pretty text-ink-soft">
            Precios en bolivianos. Toca un servicio para reservarlo directo.
          </p>
        </header>

        {catalog.isPending && (
          <div className="grid gap-3 md:grid-cols-2" role="status" aria-label="Cargando servicios">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-40 animate-pulse rounded-sheet bg-surface-strong" />
            ))}
          </div>
        )}
        {catalog.isError && (
          <div
            className={cn(warningClassName, 'flex flex-wrap items-center justify-between gap-3')}
            role="status"
          >
            No pudimos cargar los servicios. Revisa tu conexión e inténtalo de nuevo.
            <Button variant="secondary" size="sm" onClick={() => void catalog.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        {catalog.data && (
          <ServiceCatalog services={catalog.data.services} featured={publicSite.featuredServices} />
        )}

        <section
          className="mt-10 flex flex-col items-start justify-between gap-4 rounded-sheet bg-ink p-6 text-on-ink [--color-focus:var(--color-on-ink)] sm:flex-row sm:items-center sm:p-8"
          aria-labelledby="services-help"
        >
          <div>
            <h2 id="services-help" className="font-display text-3xl font-extrabold">
              ¿No sabes cuál elegir?
            </h2>
            <p className="mt-1 text-on-ink-muted">
              Reserva un corte y tu barbero te asesora en el momento.
            </p>
          </div>
          <Link
            className={cn(buttonStyles({ variant: 'inverse', size: 'lg' }), 'max-sm:w-full')}
            to="/reservar"
            viewTransition
          >
            <AppIcon name="calendar" size={20} />
            Reservar cita
          </Link>
        </section>
      </div>
    </main>
  )
}
