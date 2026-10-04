import { Link } from 'react-router-dom'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import {
  serviceGroupOf,
  type PublicService,
  type ServiceGroup,
} from '../../../core/public-booking/PublicBooking'
import { cn } from '../../styles/cn'
import { AppIcon, type IconName } from '../AppIcon'
import { serviceIcon } from './serviceIcon'

const groups: { group: ServiceGroup; title: string; icon: IconName }[] = [
  { group: 'CUTS', title: 'Cortes', icon: 'scissors' },
  { group: 'BEARD', title: 'Barba y navaja', icon: 'razor' },
  { group: 'DETAILS', title: 'Detalles', icon: 'eyebrow' },
]

const bookingPath = (service: PublicService) => `/reservar?servicio=${service.id}`
const linkLabel = (service: PublicService) =>
  `Reservar ${service.name}, ${centsToBolivianos(service.priceCents)}, ${service.durationMinutes} minutos`

interface ServiceCatalogProps {
  services: PublicService[]
  featured: string[]
  // The home previews only the featured services; the services page shows them all.
  preview?: boolean
}

// Featured services large in ink, the rest grouped by kind with green prices.
export const ServiceCatalog = ({ services, featured, preview = false }: ServiceCatalogProps) => {
  const highlighted = featured
    .map((name) => services.find((service) => service.name === name))
    .filter((service) => service !== undefined)
  const rest = services.filter((service) => !highlighted.includes(service))

  return (
    <div className="grid gap-6">
      {highlighted.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {highlighted.map((service) => (
            <li key={service.id}>
              <Link
                className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-sheet bg-ink p-6 text-on-ink transition-transform duration-200 [--color-focus:var(--color-ink)] hover:-translate-y-1 sm:p-8"
                to={bookingPath(service)}
                aria-label={linkLabel(service)}
                viewTransition
              >
                <span className="absolute -right-6 -bottom-6 text-on-ink/10" aria-hidden="true">
                  <AppIcon name={serviceIcon(service.name)} size={160} />
                </span>
                <span className="w-fit rounded-full bg-success-soft px-3 py-1 text-sm font-semibold text-success-ink">
                  Recomendado
                </span>
                <span className="font-display text-4xl leading-none font-extrabold sm:text-5xl">
                  {service.name}
                </span>
                {service.description && (
                  <span className="max-w-sm text-pretty text-on-ink-muted">
                    {service.description}
                  </span>
                )}
                <span className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-4">
                  <span className="font-display text-5xl leading-none font-extrabold tabular-nums">
                    {centsToBolivianos(service.priceCents)}
                  </span>
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-surface px-5 font-semibold text-ink transition-transform duration-200 group-hover:translate-x-1">
                    Reservar
                    <AppIcon name="arrow-right" size={18} />
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-on-ink-muted">
                  <AppIcon name="clock" size={16} />
                  {service.durationMinutes} min
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {preview ? (
        <Link
          className="group flex min-h-18 items-center justify-between gap-4 rounded-sheet border-2 border-ink bg-surface px-6 py-4 transition-colors duration-150 hover:bg-ink hover:text-on-ink"
          to="/servicios"
          viewTransition
        >
          <span>
            <span className="block font-display text-2xl font-extrabold">
              Ver todos los servicios
            </span>
            <span className="block text-ink-soft group-hover:text-on-ink-muted">
              {services.length} servicios con precio y duración
            </span>
          </span>
          <AppIcon name="arrow-right" size={24} />
        </Link>
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-3">
          {groups.map(({ group, title, icon }) => {
            const items = rest.filter((service) => serviceGroupOf(service.name) === group)
            if (items.length === 0) return null
            return (
              <section
                key={group}
                className="rounded-sheet bg-surface p-5 shadow-raised"
                aria-labelledby={`group-${group}`}
              >
                <h3
                  id={`group-${group}`}
                  className="flex items-center gap-3 font-display text-3xl font-extrabold"
                >
                  <span className="grid size-11 place-items-center rounded-full bg-ink text-on-ink">
                    <AppIcon name={icon} size={22} />
                  </span>
                  {title}
                </h3>
                <ul className="mt-3 grid">
                  {items.map((service, index) => (
                    <li
                      key={service.id}
                      className={cn(index > 0 && 'border-t border-surface-strong')}
                    >
                      <Link
                        className="group flex min-h-18 items-center gap-3 rounded-control px-2 py-3 transition-colors duration-150 hover:bg-paper-warm"
                        to={bookingPath(service)}
                        aria-label={linkLabel(service)}
                        viewTransition
                      >
                        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-paper-warm text-ink transition-colors duration-150 group-hover:bg-ink group-hover:text-on-ink">
                          <AppIcon name={serviceIcon(service.name)} size={24} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg font-semibold">{service.name}</span>
                          <span className="block text-ink-soft">{service.durationMinutes} min</span>
                        </span>
                        <span className="font-display text-2xl font-extrabold text-success-ink tabular-nums">
                          {centsToBolivianos(service.priceCents)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
