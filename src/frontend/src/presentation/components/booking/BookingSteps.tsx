import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { agendaTime } from '../../../core/agenda/Agenda'
import { centsToBolivianos } from '../../../core/configuration/Configuration'
import {
  monthWeeks,
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

const weekdayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const monthTitle = (month: string) =>
  new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(
    new Date(`${month}-15T12:00:00Z`),
  )

const longDayName = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00Z`))

// A month calendar for the booking. Past days and days without free times are greyed
// out; today is outlined and the chosen day filled in ink.
export const MonthCalendar = ({
  month,
  today,
  selected,
  available,
  canGoBack,
  canGoForward,
  onMonthChange,
  onSelect,
}: {
  month: string
  today: string
  selected: string
  // Days known to have free times; undefined while they load.
  available: Set<string> | undefined
  canGoBack: boolean
  canGoForward: boolean
  onMonthChange: (delta: number) => void
  onSelect: (date: string) => void
}) => (
  <div className="rounded-control bg-paper-warm p-3 sm:p-4">
    <div className="mb-2 flex items-center justify-between gap-2">
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full hover:bg-surface disabled:pointer-events-none disabled:opacity-30"
        aria-label="Mes anterior"
        disabled={!canGoBack}
        onClick={() => onMonthChange(-1)}
      >
        <AppIcon name="arrow-left" size={20} />
      </button>
      <h3
        className="font-display text-2xl font-extrabold first-letter:uppercase"
        aria-live="polite"
      >
        {monthTitle(month)}
      </h3>
      <button
        type="button"
        className="grid size-11 place-items-center rounded-full hover:bg-surface disabled:pointer-events-none disabled:opacity-30"
        aria-label="Mes siguiente"
        disabled={!canGoForward}
        onClick={() => onMonthChange(1)}
      >
        <AppIcon name="arrow-right" size={20} />
      </button>
    </div>
    <div
      className="grid grid-cols-7 gap-1 text-center"
      role="group"
      aria-label={`Días de ${monthTitle(month)}`}
    >
      {weekdayNames.map((name) => (
        <span key={name} aria-hidden="true" className="py-1 text-sm font-semibold text-ink-soft">
          {name}
        </span>
      ))}
      {monthWeeks(month)
        .flat()
        .map((date, index) => {
          if (!date) return <span key={`empty-${index}`} aria-hidden="true" />
          const past = date < today
          const loading = available === undefined
          const free = !past && (loading || available.has(date))
          const active = date === selected
          return (
            <button
              key={date}
              type="button"
              aria-pressed={active}
              aria-current={date === today ? 'date' : undefined}
              aria-label={`${longDayName(date)}${!free && !past && !loading ? ', sin horarios' : ''}`}
              disabled={!free}
              className={cn(
                'mx-auto grid aspect-square w-full max-w-12 min-h-11 place-items-center rounded-full font-semibold tabular-nums transition-colors duration-150',
                active && 'bg-ink text-on-ink',
                !active && free && 'bg-surface hover:bg-ink hover:text-on-ink',
                !free && 'cursor-not-allowed text-ink-muted/60',
                date === today && !active && 'ring-2 ring-ink ring-inset',
              )}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(8))}
            </button>
          )
        })}
    </div>
  </div>
)

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
  <div className="grid gap-5">
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
