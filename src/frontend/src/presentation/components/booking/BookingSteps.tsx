import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { agendaTime } from '../../../core/agenda/Agenda'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import {
  serviceGroupOf,
  type PublicBarber,
  type PublicService,
  type ServiceGroup,
} from '../../../core/public-booking/PublicBooking'
import type { AvailabilitySlot } from '../../../core/scheduling/Scheduling'
import { publicSite } from '../../content/publicSite'
import { cn } from '../../styles/cn'
import { fieldClassName, labelClassName } from '../../styles/formStyles'
import { AppIcon } from '../AppIcon'
import { initialsOf } from '../initials'
import { serviceIcon } from '../public/serviceIcon'

// Moves focus to each step's title so screen readers announce the new step.
export const StepHeading = ({ children, lead }: { children: ReactNode; lead?: string }) => {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => heading.current?.focus({ preventScroll: true }), [])
  return (
    <header className="mb-5">
      <h2
        ref={heading}
        tabIndex={-1}
        className="font-display text-4xl leading-none font-extrabold text-balance outline-none sm:text-5xl"
      >
        {children}
      </h2>
      {lead && <p className="mt-2 text-lg text-pretty text-ink-soft">{lead}</p>}
    </header>
  )
}

const choiceClassName = (selected: boolean) =>
  cn(
    'flex w-full items-center gap-3 rounded-control border-2 px-4 py-3 text-left transition-colors duration-150',
    selected
      ? 'border-ink bg-ink text-on-ink'
      : 'border-transparent bg-paper-warm hover:border-line-control',
  )

const groups: { group: ServiceGroup; title: string }[] = [
  { group: 'CUTS', title: 'Cortes' },
  { group: 'BEARD', title: 'Barba y navaja' },
  { group: 'DETAILS', title: 'Detalles' },
]

export const ServicePicker = ({
  services,
  selectedId,
  onSelect,
}: {
  services: PublicService[]
  selectedId: string
  onSelect: (service: PublicService) => void
}) => (
  <div className="grid gap-6">
    {groups.map(({ group, title }) => {
      const items = services.filter((service) => serviceGroupOf(service.name) === group)
      if (items.length === 0) return null
      return (
        <section key={group} aria-labelledby={`booking-${group}`}>
          <h3 id={`booking-${group}`} className="mb-2 text-lg font-semibold text-ink-soft">
            {title}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={title}>
            {items.map((service) => {
              const selected = service.id === selectedId
              return (
                <button
                  key={service.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={cn(choiceClassName(selected), 'min-h-20')}
                  onClick={() => onSelect(service)}
                >
                  <span
                    className={cn(
                      'grid size-12 shrink-0 place-items-center rounded-full',
                      selected ? 'bg-on-ink text-ink' : 'bg-surface text-ink',
                    )}
                  >
                    <AppIcon name={serviceIcon(service.name)} size={24} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold">{service.name}</span>
                    <span className={cn('block', selected ? 'text-on-ink-muted' : 'text-ink-soft')}>
                      {service.durationMinutes} min
                    </span>
                  </span>
                  <span
                    className={cn(
                      'font-display text-2xl font-extrabold tabular-nums',
                      !selected && 'text-success-ink',
                    )}
                  >
                    {centsToBolivianos(service.priceCents)}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )
    })}
  </div>
)

export const BarberPicker = ({
  barbers,
  selectedId,
  onSelect,
}: {
  barbers: PublicBarber[]
  selectedId: string
  onSelect: (barberId: string) => void
}) => (
  <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Barbero">
    {[{ id: 'any', displayName: 'Cualquiera' }, ...barbers].map((barber) => {
      const selected = barber.id === selectedId
      const photo = publicSite.photos.barbers[barber.displayName]
      return (
        <button
          key={barber.id}
          type="button"
          role="radio"
          aria-checked={selected}
          className={cn(choiceClassName(selected), 'min-h-20')}
          onClick={() => onSelect(barber.id)}
        >
          {photo ? (
            <img
              className="size-14 shrink-0 rounded-full object-cover"
              src={photo.src}
              alt=""
              width={photo.width}
              height={photo.height}
              loading="lazy"
            />
          ) : (
            <span
              aria-hidden="true"
              className={cn(
                'grid size-14 shrink-0 place-items-center rounded-full font-display text-xl font-extrabold',
                selected ? 'bg-on-ink text-ink' : 'bg-ink text-on-ink',
              )}
            >
              {barber.id === 'any' ? (
                <AppIcon name="scissors" size={24} />
              ) : (
                initialsOf(barber.displayName)
              )}
            </span>
          )}
          <span className="min-w-0">
            <span className="block font-display text-2xl leading-none font-extrabold">
              {barber.displayName}
            </span>
            {barber.id === 'any' && (
              <span className={cn('mt-1 block', selected ? 'text-on-ink-muted' : 'text-ink-soft')}>
                Te damos el primer horario libre
              </span>
            )}
          </span>
        </button>
      )
    })}
  </div>
)

const dayLabel = (date: string, today: string, tomorrow: string) => {
  const value = new Date(`${date}T12:00:00Z`)
  const weekday = new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', weekday: 'short' })
    .format(value)
    .replace('.', '')
  return {
    name: date === today ? 'Hoy' : date === tomorrow ? 'Mañana' : weekday,
    day: value.getUTCDate(),
    month: new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', month: 'short' })
      .format(value)
      .replace('.', ''),
  }
}

export const DayPicker = ({
  days,
  today,
  selected,
  available,
  onSelect,
}: {
  days: string[]
  today: string
  selected: string
  // Days known to have free times; undefined while they load.
  available: Set<string> | undefined
  onSelect: (date: string) => void
}) => {
  const [otherDate, setOtherDate] = useState(!days.includes(selected))
  const tomorrow = days[1] ?? ''
  return (
    <div>
      <div
        className="-mx-5 flex snap-x gap-2 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8"
        role="radiogroup"
        aria-label="Día"
      >
        {days.map((date) => {
          const label = dayLabel(date, today, tomorrow)
          const full = available !== undefined && !available.has(date)
          const active = date === selected
          return (
            <button
              key={date}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${label.name} ${label.day} de ${label.month}${full ? ', sin horarios' : ''}`}
              disabled={full}
              className={cn(
                'flex min-h-20 w-18 shrink-0 snap-start flex-col items-center justify-center rounded-control border-2 transition-colors duration-150',
                active
                  ? 'border-ink bg-ink text-on-ink'
                  : 'border-transparent bg-paper-warm hover:border-line-control',
                full && 'cursor-not-allowed bg-surface-muted text-ink-muted line-through',
              )}
              onClick={() => onSelect(date)}
            >
              <span className="text-sm font-semibold first-letter:uppercase">{label.name}</span>
              <span className="font-display text-2xl leading-none font-extrabold tabular-nums">
                {label.day}
              </span>
              <span className="text-sm">{label.month}</span>
            </button>
          )
        })}
      </div>
      {otherDate ? (
        <label className={cn(labelClassName, 'mt-3 max-w-xs')}>
          Otra fecha
          <input
            className={fieldClassName}
            type="date"
            name="booking-date"
            min={today}
            value={selected}
            onChange={(event) => event.target.value && onSelect(event.target.value)}
          />
        </label>
      ) : (
        <button
          type="button"
          className="mt-2 inline-flex min-h-11 items-center gap-2 px-1 font-semibold underline underline-offset-4 hover:no-underline"
          onClick={() => setOtherDate(true)}
        >
          <AppIcon name="calendar" size={18} />
          Otra fecha
        </button>
      )}
    </div>
  )
}

export const SlotPicker = ({
  morning,
  afternoon,
  selected,
  showBarber,
  onSelect,
}: {
  morning: AvailabilitySlot[]
  afternoon: AvailabilitySlot[]
  selected: AvailabilitySlot | undefined
  // With "Cualquiera", each time says who is free; with a chosen barber it is implied.
  showBarber: boolean
  onSelect: (slot: AvailabilitySlot) => void
}) => (
  <div className="grid gap-5 md:grid-cols-2">
    {(
      [
        ['Mañana', morning],
        ['Tarde', afternoon],
      ] as const
    ).map(([title, slots]) => (
      <section key={title} aria-label={title}>
        <h3 className="mb-2 text-lg font-semibold text-ink-soft">{title}</h3>
        {slots.length === 0 ? (
          <p className="rounded-control bg-surface-muted p-4 text-ink-soft">Sin horarios libres.</p>
        ) : (
          <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label={`Horarios de ${title.toLowerCase()}`}
          >
            {slots.map((slot) => {
              const active =
                selected?.startsAt === slot.startsAt && selected.barberId === slot.barberId
              return (
                <button
                  key={`${slot.barberId}-${slot.startsAt}`}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${agendaTime(slot.startsAt)}, ${slot.barberName}`}
                  className={cn(
                    'flex min-h-14 flex-col items-center justify-center rounded-control border-2 px-1 transition-colors duration-150',
                    active
                      ? 'border-ink bg-ink text-on-ink'
                      : 'border-transparent bg-paper-warm hover:border-line-control',
                  )}
                  onClick={() => onSelect(slot)}
                >
                  <span className="font-display text-2xl leading-none font-extrabold tabular-nums">
                    {agendaTime(slot.startsAt)}
                  </span>
                  {showBarber && (
                    <span
                      className={cn(
                        'mt-0.5 max-w-full truncate text-sm',
                        active ? 'text-on-ink-muted' : 'text-ink-soft',
                      )}
                    >
                      {slot.barberName.split(' ')[0]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>
    ))}
  </div>
)

export const CustomerForm = ({
  displayName,
  phone,
  privacyAccepted,
  onDisplayNameChange,
  onPhoneChange,
  onPrivacyChange,
}: {
  displayName: string
  phone: string
  privacyAccepted: boolean
  onDisplayNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onPrivacyChange: (value: boolean) => void
}) => (
  <div className="grid gap-5">
    <label className={labelClassName}>
      Nombre
      <input
        className={fieldClassName}
        name="name"
        autoComplete="name"
        minLength={2}
        maxLength={120}
        required
        value={displayName}
        onChange={(event) => onDisplayNameChange(event.target.value)}
      />
    </label>
    <label className={labelClassName}>
      WhatsApp o teléfono
      <input
        className={fieldClassName}
        name="phone"
        type="tel"
        autoComplete="tel"
        inputMode="tel"
        required
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
      />
    </label>
    <label className="flex min-h-14 items-start gap-3 rounded-control bg-paper-warm p-4">
      <input
        className="mt-0.5 size-6 shrink-0 accent-ink"
        type="checkbox"
        name="privacy"
        required
        checked={privacyAccepted}
        onChange={(event) => onPrivacyChange(event.target.checked)}
      />
      <span>Autorizo usar mi nombre y teléfono solo para gestionar esta cita.</span>
    </label>
    <p className="text-ink-soft">
      Puedes leer cómo cuidamos tus datos en el{' '}
      <Link
        className="inline-flex min-h-11 items-center font-semibold text-ink underline underline-offset-4"
        to="/privacidad"
      >
        aviso de privacidad
      </Link>
      .
    </p>
  </div>
)

export const ReviewList = ({
  rows,
  onChange,
}: {
  rows: { label: string; value: string; step: number }[]
  onChange: (step: number) => void
}) => (
  <dl className="divide-y divide-surface-strong rounded-control bg-paper-warm">
    {rows.map((row) => (
      <div key={row.label} className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <dt className="text-sm text-ink-soft">{row.label}</dt>
          <dd className="font-semibold text-pretty">{row.value}</dd>
        </div>
        <button
          type="button"
          className="min-h-11 shrink-0 rounded-control px-3 font-semibold underline underline-offset-4 hover:bg-surface"
          aria-label={`Cambiar ${row.label.toLowerCase()}`}
          onClick={() => onChange(row.step)}
        >
          Cambiar
        </button>
      </div>
    ))}
  </dl>
)
