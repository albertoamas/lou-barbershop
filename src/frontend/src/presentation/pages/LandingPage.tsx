import { useQuery } from '@tanstack/react-query'
import { m, type MotionProps } from 'motion/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { openingHoursText, openingStatus, openingStatusText } from '../../core/shop/OpeningHours'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { Stripes } from '../components/Stripes'
import { publicSite } from '../content/publicSite'
import { useMinuteClock } from '../hooks/useMinuteClock'
import { cn } from '../styles/cn'
import { warningClassName } from '../styles/formStyles'

// Sections settle in once as they enter the screen; MotionProvider honours reduced motion.
const reveal: MotionProps = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
}

const sectionClassName =
  'mx-auto w-full max-w-360 scroll-mt-24 px-4 py-14 sm:px-6 lg:px-10 lg:py-20'

const SectionTitle = ({ id, children, lead }: { id: string; children: string; lead?: string }) => (
  <div className="mb-6 max-w-2xl">
    <h2 id={id} className="font-display text-4xl leading-none font-extrabold sm:text-5xl">
      {children}
    </h2>
    {lead && <p className="mt-3 text-lg text-pretty text-ink-soft">{lead}</p>}
  </div>
)

export const LandingPage = () => {
  const now = useMinuteClock()
  const status = openingStatus(now)
  const [showMap, setShowMap] = useState(false)
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })
  const { photos } = publicSite

  return (
    <main className="bg-canvas">
      <section
        className="relative isolate overflow-hidden bg-ink px-4 pt-28 pb-12 text-on-ink [--color-focus:var(--color-on-ink)] sm:px-6 lg:px-10 lg:pt-36 lg:pb-20"
        aria-labelledby="landing-title"
      >
        <div className="mx-auto grid w-full max-w-360 items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <m.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <h1
              id="landing-title"
              className="font-display text-[clamp(3.5rem,13vw,7.5rem)] leading-[0.85] font-extrabold text-balance"
            >
              Lou Barbershop
            </h1>
            <p className="mt-5 max-w-xl text-xl text-pretty text-on-ink-muted">
              Cortes, barba y navaja en {publicSite.city}. Reserva en un minuto, sin crear una
              cuenta.
            </p>
            <p className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-on-ink/10 px-4 font-semibold">
              <AppIcon name="clock" size={18} />
              {openingStatusText(status)}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                className={buttonStyles({ variant: 'inverse', size: 'lg' })}
                to="/reservar"
                viewTransition
              >
                <AppIcon name="calendar" size={20} />
                Reservar cita
              </Link>
              {publicSite.whatsappUrl && (
                <a
                  className={cn(
                    buttonStyles({ variant: 'ghost', size: 'lg' }),
                    'border-on-ink/30 text-on-ink hover:bg-on-ink/10',
                  )}
                  href={publicSite.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Escribir por WhatsApp
                </a>
              )}
            </div>
            <Link
              className="mt-4 inline-flex min-h-11 items-center font-semibold text-on-ink-muted underline-offset-4 hover:text-on-ink hover:underline"
              to="/mi-cita"
              viewTransition
            >
              Ya tengo cita
            </Link>
          </m.div>

          <div className="hidden lg:block">
            {photos.shop ? (
              <img
                className="aspect-[4/5] w-full rounded-sheet object-cover"
                src={photos.shop.src}
                alt={photos.shop.alt}
                width={photos.shop.width}
                height={photos.shop.height}
                fetchPriority="high"
              />
            ) : (
              <img
                className="mx-auto aspect-square w-full max-w-md rounded-sheet"
                src="/brand/lou-logo.jpg"
                alt="Logo de Lou Barbershop: dos navajas cruzadas sobre la palabra Barbershop"
                width={1080}
                height={1080}
                fetchPriority="high"
              />
            )}
          </div>
        </div>
        <Stripes className="absolute inset-x-0 bottom-0 h-2.5" />
      </section>

      <m.section
        id="servicios"
        className={sectionClassName}
        aria-labelledby="services-title"
        {...reveal}
      >
        <SectionTitle id="services-title" lead="Precio y duración de cada servicio.">
          Servicios
        </SectionTitle>
        {catalog.isPending && (
          <div className="grid gap-3" role="status" aria-label="Cargando servicios">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-panel bg-surface-strong" />
            ))}
          </div>
        )}
        {catalog.isError && (
          <div
            className={cn(warningClassName, 'flex flex-wrap items-center justify-between gap-3')}
            role="status"
          >
            No pudimos cargar los servicios. Puedes reservar igual y verlos ahí.
            <Button variant="secondary" size="sm" onClick={() => void catalog.refetch()}>
              Reintentar
            </Button>
          </div>
        )}
        {catalog.data && (
          <ul className="grid gap-3 md:grid-cols-2">
            {catalog.data.services.map((service) => (
              <li
                key={service.id}
                className="grid gap-1 rounded-panel bg-surface p-5 shadow-raised"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-2xl leading-tight font-extrabold">
                    {service.name}
                  </h3>
                  <strong className="shrink-0 font-display text-2xl font-extrabold tabular-nums">
                    {centsToBolivianos(service.priceCents)}
                  </strong>
                </div>
                {service.description && (
                  <p className="text-pretty text-ink-soft">{service.description}</p>
                )}
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="inline-flex items-center gap-1.5 text-ink-soft">
                    <AppIcon name="clock" size={16} />
                    {service.durationMinutes} min
                  </span>
                  <Link
                    className={buttonStyles({ variant: 'secondary', size: 'sm' })}
                    to={`/reservar?servicio=${service.id}`}
                    aria-label={`Reservar ${service.name}`}
                    viewTransition
                  >
                    Reservar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </m.section>

      {catalog.data && catalog.data.barbers.length > 0 && (
        <m.section
          id="equipo"
          className={sectionClassName}
          aria-labelledby="team-title"
          {...reveal}
        >
          <SectionTitle id="team-title" lead="Elige con quién quieres atenderte.">
            Nuestro equipo
          </SectionTitle>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-3">
            {catalog.data.barbers.map((barber) => {
              const photo = photos.barbers[barber.displayName]
              return (
                <li
                  key={barber.id}
                  className="flex items-center gap-4 rounded-panel bg-surface p-4 shadow-raised"
                >
                  {photo ? (
                    <img
                      className="size-16 shrink-0 rounded-full object-cover"
                      src={photo.src}
                      alt={photo.alt}
                      width={photo.width}
                      height={photo.height}
                      loading="lazy"
                    />
                  ) : (
                    <Avatar name={barber.displayName} size="lg" tone="ink" className="size-16" />
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-display text-2xl font-extrabold">
                      {barber.displayName}
                    </h3>
                    <Link
                      className="-ml-1 inline-flex min-h-11 items-center px-1 font-semibold underline underline-offset-4 hover:no-underline"
                      to={`/reservar?barbero=${barber.id}`}
                      viewTransition
                    >
                      Reservar con {barber.displayName.split(' ')[0]}
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        </m.section>
      )}

      {photos.gallery.length > 0 && (
        <m.section
          id="trabajos"
          className={sectionClassName}
          aria-labelledby="work-title"
          {...reveal}
        >
          <SectionTitle id="work-title">Trabajos recientes</SectionTitle>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.gallery.map((photo) => (
              <li key={photo.src}>
                <img
                  className="aspect-square w-full rounded-panel object-cover"
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  loading="lazy"
                />
              </li>
            ))}
          </ul>
        </m.section>
      )}

      <m.section
        id="ubicacion"
        className={sectionClassName}
        aria-labelledby="location-title"
        {...reveal}
      >
        <SectionTitle id="location-title">Horario y ubicación</SectionTitle>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-panel bg-surface p-5 shadow-raised">
            <h3 className="font-display text-2xl font-extrabold">Horario</h3>
            <p className="mt-2 text-lg">Todos los días, de {openingHoursText()}.</p>
            <p
              className={cn(
                'mt-3 inline-flex min-h-10 items-center gap-2 rounded-full px-4 font-semibold',
                status.open ? 'bg-success-soft text-success-ink' : 'bg-surface-muted text-ink-soft',
              )}
            >
              <AppIcon name="clock" size={18} />
              {openingStatusText(status)}
            </p>
          </div>
          <div className="rounded-panel bg-surface p-5 shadow-raised">
            <h3 className="font-display text-2xl font-extrabold">Dónde estamos</h3>
            <p className="mt-2 text-lg">
              {publicSite.address ?? `Lou Barbershop, ${publicSite.city}.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className={buttonStyles({ variant: 'primary' })}
                href={publicSite.mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <AppIcon name="map-pin" size={20} />
                Cómo llegar
              </a>
              <Button
                variant="secondary"
                aria-expanded={showMap}
                aria-controls="landing-map"
                onClick={() => setShowMap((value) => !value)}
              >
                {showMap ? 'Ocultar mapa' : 'Ver mapa'}
              </Button>
            </div>
          </div>
        </div>
        {/* The map loads Google only when asked for, keeping the page light and private. */}
        <div id="landing-map">
          {showMap && (
            <iframe
              className="mt-3 aspect-[4/3] w-full rounded-panel border-0 shadow-raised sm:aspect-[16/7]"
              src={publicSite.mapEmbedUrl}
              title="Mapa de la ubicación de Lou Barbershop"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>
      </m.section>
    </main>
  )
}
