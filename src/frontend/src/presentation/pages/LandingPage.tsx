import { useQuery } from '@tanstack/react-query'
import { m, type MotionProps } from 'motion/react'
import { Link } from 'react-router-dom'
import { openingHoursText } from '../../core/shop/OpeningHours'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { Stripes } from '../components/Stripes'
import { MediaFrame } from '../components/public/MediaFrame'
import { OpenStatus } from '../components/public/OpenStatus'
import { ServiceCatalog } from '../components/public/ServiceCatalog'
import { initialsOf } from '../components/initials'
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

const SectionTitle = ({
  id,
  children,
  lead,
  inverse = false,
}: {
  id: string
  children: string
  lead?: string
  inverse?: boolean
}) => (
  <div className="mb-6 max-w-2xl">
    <h2 id={id} className="font-display text-4xl leading-none font-extrabold sm:text-5xl">
      {children}
    </h2>
    {lead && (
      <p
        className={cn('mt-3 text-lg text-pretty', inverse ? 'text-on-ink-muted' : 'text-ink-soft')}
      >
        {lead}
      </p>
    )}
  </div>
)

export const LandingPage = () => {
  const now = useMinuteClock()
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })
  const { photos } = publicSite

  return (
    <main className="bg-paper-warm">
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
            <div className="mt-5">
              <OpenStatus now={now} onDark />
            </div>
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
        <SectionTitle
          id="services-title"
          lead="Nuestros recomendados. Toca uno para reservarlo directo."
        >
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
          <ServiceCatalog
            services={catalog.data.services}
            featured={publicSite.featuredServices}
            preview
          />
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
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
            {catalog.data.barbers.map((barber) => (
              <li key={barber.id} className="rounded-sheet bg-surface p-3 shadow-raised">
                <div className="relative">
                  <MediaFrame photo={photos.barbers[barber.displayName]} ratio="4 / 5" />
                  {!photos.barbers[barber.displayName] && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-3 left-3 grid size-14 place-items-center rounded-full bg-surface font-display text-2xl font-extrabold text-ink"
                    >
                      {initialsOf(barber.displayName)}
                    </span>
                  )}
                </div>
                <div className="px-2 pt-3 pb-1">
                  <h3 className="font-display text-2xl leading-none font-extrabold sm:text-3xl">
                    {barber.displayName}
                  </h3>
                  <Link
                    className={cn(buttonStyles({ variant: 'primary', size: 'sm' }), 'mt-3 w-full')}
                    to={`/reservar?barbero=${barber.id}`}
                    aria-label={`Reservar con ${barber.displayName}`}
                    viewTransition
                  >
                    Reservar
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </m.section>
      )}

      <section className="bg-ink py-14 text-on-ink lg:py-20" aria-labelledby="work-title">
        <m.div className="mx-auto w-full max-w-360 px-4 sm:px-6 lg:px-10" {...reveal}>
          <SectionTitle id="work-title" inverse lead="Algunos de nuestros cortes.">
            Trabajos
          </SectionTitle>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {(photos.gallery.length > 0
              ? photos.gallery
              : Array.from({ length: photos.galleryFrames }, () => undefined)
            ).map((photo, index) => (
              <li key={photo?.src ?? `frame-${index}`}>
                <MediaFrame photo={photo} className="ring-1 ring-on-ink/15" />
              </li>
            ))}
          </ul>
        </m.div>
      </section>

      <m.section
        id="ubicacion"
        className={sectionClassName}
        aria-labelledby="location-title"
        {...reveal}
      >
        <SectionTitle id="location-title">Horario y ubicación</SectionTitle>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="grid content-start gap-6 rounded-sheet bg-surface p-6 shadow-raised">
            <div>
              <h3 className="flex items-center gap-2 font-semibold text-ink-soft">
                <AppIcon name="clock" size={20} />
                Horario
              </h3>
              <p className="mt-2 font-display text-3xl leading-tight font-extrabold">
                Lunes a domingo
              </p>
              <p className="mt-1 text-xl">{openingHoursText()}</p>
              <div className="mt-3">
                <OpenStatus now={now} />
              </div>
            </div>
            <div className="border-t border-surface-strong pt-6">
              <h3 className="flex items-center gap-2 font-semibold text-ink-soft">
                <AppIcon name="map-pin" size={20} />
                Dónde estamos
              </h3>
              <p className="mt-2 font-display text-3xl leading-tight font-extrabold">
                {publicSite.address ?? `Lou Barbershop, ${publicSite.city}`}
              </p>
              <a
                className={cn(buttonStyles({ variant: 'primary' }), 'mt-4 max-sm:w-full')}
                href={publicSite.mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                <AppIcon name="map-pin" size={20} />
                Cómo llegar
              </a>
            </div>
          </div>
          <iframe
            className="aspect-[4/3] h-full min-h-72 w-full rounded-sheet border-0 bg-surface-muted shadow-raised"
            src={publicSite.mapEmbedUrl}
            title="Mapa de la ubicación de Lou Barbershop"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </m.section>
    </main>
  )
}
