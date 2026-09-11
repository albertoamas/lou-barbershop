import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { Link } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import type {
  PublicBarber,
  PublicBookingConfirmation,
  PublicService,
} from '../../core/public-booking/PublicBooking'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { ApiError } from '../../infrastructure/http/apiClient'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'

const steps = ['Servicio', 'Barbero', 'Fecha y hora', 'Datos', 'Confirmar'] as const
const fieldClassName =
  'min-h-12 w-full rounded-xl border border-lou-steel/60 bg-white px-4 text-base shadow-sm outline-none transition-[border-color,box-shadow] focus:border-lou-ink focus:ring-3 focus:ring-lou-ink/10'
const labelClassName = 'grid gap-2 text-sm font-bold text-lou-ink'
const panelClassName = 'rounded-2xl border border-lou-fog bg-white p-5 shadow-lou-sm sm:p-7'

export const PublicBookingPage = () => {
  const connectivity = useConnectivity()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [serviceId, setServiceId] = useState('')
  const [barberId, setBarberId] = useState('any')
  const [date, setDate] = useState(todayInBusinessTime())
  const [slot, setSlot] = useState<AvailabilitySlot>()
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [confirmation, setConfirmation] = useState<PublicBookingConfirmation>()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [validation, setValidation] = useState('')
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })
  const slots = useQuery({
    queryKey: ['public-booking', 'availability', serviceId, barberId, date],
    enabled: step === 2 && Boolean(serviceId),
    networkMode: 'always',
    retry: false,
    queryFn: () => publicBookingApi.availability(serviceId, barberId, date),
  })
  const selectedService = catalog.data?.services.find((service) => service.id === serviceId)
  const selectedBarber = catalog.data?.barbers.find((barber) => barber.id === barberId)

  const goTo = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1)
    setValidation('')
    setNotice('')
    setStep(nextStep)
  }

  const continueFromStep = () => {
    if (step === 0 && !serviceId) return setValidation('Elige un servicio para continuar.')
    if (step === 2 && !slot) return setValidation('Elige una hora disponible para continuar.')
    if (step === 3) {
      if (displayName.trim().length < 2) return setValidation('Escribe tu nombre completo.')
      if (phone.trim().length < 7) return setValidation('Escribe un teléfono válido.')
      if (!privacyAccepted)
        return setValidation('Necesitamos tu autorización para gestionar la cita.')
    }
    goTo(Math.min(step + 1, steps.length - 1))
  }

  const confirm = async () => {
    if (!slot || connectivity !== 'online' || busy) return
    setBusy(true)
    setNotice('')
    try {
      setConfirmation(
        await publicBookingApi.create({
          serviceId: slot.serviceId,
          barberId: slot.barberId,
          startsAt: slot.startsAt,
          displayName: displayName.trim(),
          phone: phone.trim(),
          privacyAccepted,
        }),
      )
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? 'No pudimos confirmar la cita.')
          : 'No pudimos confirmar. Revisa tu conexión antes de volver a intentar.',
      )
      if (error instanceof ApiError && error.problem.status === 409) {
        setSlot(undefined)
        goTo(2)
        await slots.refetch()
      }
    } finally {
      setBusy(false)
    }
  }

  if (confirmation) return <BookingSuccess confirmation={confirmation} />

  return (
    <main className="bg-lou-paper px-4 py-8 sm:px-6 lg:py-12">
      <div className="mx-auto w-full max-w-360">
        <header className="max-w-3xl">
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Reserva en línea
          </p>
          <h1 className="m-0 font-display text-5xl leading-[0.88] font-bold sm:text-7xl">
            Tu cita, paso a paso.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-lou-graphite/65 sm:text-base">
            Elige sólo lo necesario. Confirmaremos el precio y el horario antes de reservar.
          </p>
        </header>

        <BookingProgress currentStep={step} onSelect={goTo} />
        <div className="mt-7 grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <section className={cn(panelClassName, 'min-w-0 overflow-hidden')}>
            <AnimatePresence mode="wait" initial={false}>
              <m.div
                key={step}
                initial={{ opacity: 0, x: direction * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.22 }}
              >
                {step === 0 && (
                  <ServiceStep
                    catalog={catalog}
                    selectedId={serviceId}
                    onSelect={(service) => {
                      if (service.id !== serviceId) setSlot(undefined)
                      setServiceId(service.id)
                      setValidation('')
                    }}
                  />
                )}
                {step === 1 && (
                  <BarberStep
                    barbers={catalog.data?.barbers ?? []}
                    selectedId={barberId}
                    onSelect={(barber) => {
                      const nextBarberId = barber?.id ?? 'any'
                      if (nextBarberId !== barberId) setSlot(undefined)
                      setBarberId(nextBarberId)
                    }}
                  />
                )}
                {step === 2 && (
                  <ScheduleStep
                    date={date}
                    onDateChange={(nextDate) => {
                      setDate(nextDate)
                      setSlot(undefined)
                    }}
                    slots={slots}
                    selectedSlot={slot}
                    onSelect={(nextSlot) => {
                      setSlot(nextSlot)
                      setValidation('')
                    }}
                    offline={connectivity === 'offline'}
                  />
                )}
                {step === 3 && (
                  <CustomerStep
                    displayName={displayName}
                    phone={phone}
                    privacyAccepted={privacyAccepted}
                    onDisplayNameChange={setDisplayName}
                    onPhoneChange={setPhone}
                    onPrivacyChange={setPrivacyAccepted}
                  />
                )}
                {step === 4 && slot && (
                  <ReviewStep
                    serviceName={selectedService?.name ?? 'Servicio'}
                    slot={slot}
                    displayName={displayName}
                  />
                )}
              </m.div>
            </AnimatePresence>

            {validation && <InlineError>{validation}</InlineError>}
            {notice && <InlineError>{notice}</InlineError>}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-lou-fog pt-5">
              {step > 0 ? (
                <Button variant="ghost" onClick={() => goTo(step - 1)}>
                  <AppIcon name="arrow-left" size={18} /> Volver
                </Button>
              ) : (
                <Link className={buttonStyles({ variant: 'ghost' })} to="/" viewTransition>
                  <AppIcon name="arrow-left" size={18} /> Inicio
                </Link>
              )}
              {step < 4 ? (
                <Button onClick={continueFromStep}>
                  Continuar <AppIcon name="arrow-right" size={18} />
                </Button>
              ) : (
                <Button disabled={busy || connectivity !== 'online'} onClick={() => void confirm()}>
                  {busy
                    ? 'Confirmando…'
                    : connectivity === 'offline'
                      ? 'Conéctate para confirmar'
                      : 'Confirmar reserva'}
                </Button>
              )}
            </div>
          </section>
          <BookingSummary
            service={selectedService}
            barberName={selectedBarber?.displayName}
            date={date}
            slot={slot}
          />
        </div>
      </div>
    </main>
  )
}

const StepHeading = ({ eyebrow, children }: { eyebrow: string; children: ReactNode }) => {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => headingRef.current?.focus(), [])
  return (
    <header>
      <p className="mb-2 text-xs font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
        {eyebrow}
      </p>
      <h2
        className="m-0 font-display text-4xl leading-none font-bold outline-none sm:text-5xl"
        ref={headingRef}
        tabIndex={-1}
      >
        {children}
      </h2>
    </header>
  )
}

const BookingProgress = ({
  currentStep,
  onSelect,
}: {
  currentStep: number
  onSelect: (step: number) => void
}) => (
  <nav className="mt-8" aria-label="Progreso de reserva">
    <div className="mb-3 flex items-end justify-between sm:hidden">
      <div>
        <span className="text-xs font-bold tracking-[0.16em] text-lou-graphite/45 uppercase">
          Paso {currentStep + 1} de {steps.length}
        </span>
        <strong className="mt-1 block font-display text-2xl leading-none">
          {steps[currentStep]}
        </strong>
      </div>
      <span className="font-display text-2xl font-bold tabular-nums">
        {Math.round(((currentStep + 1) / steps.length) * 100)}%
      </span>
    </div>
    <ol className="grid grid-cols-5 gap-1.5 sm:gap-3">
      {steps.map((label, index) => (
        <li key={label}>
          <button
            className={cn(
              'grid min-h-3 w-full gap-2 rounded-full text-left text-xs font-bold transition-[background-color,color] duration-200 sm:min-h-0 sm:rounded-none sm:border-t-2 sm:bg-transparent sm:pt-3',
              index < currentStep && 'bg-emerald-700 text-emerald-800 sm:border-emerald-700',
              index === currentStep && 'bg-lou-ink text-lou-ink sm:border-lou-ink',
              index > currentStep && 'bg-lou-fog text-lou-steel sm:border-lou-fog',
            )}
            type="button"
            disabled={index >= currentStep}
            onClick={() => onSelect(index)}
            aria-current={index === currentStep ? 'step' : undefined}
            aria-label={`${index + 1}. ${label}${index === currentStep ? ', paso actual' : ''}`}
          >
            <span className="hidden tabular-nums sm:block">0{index + 1}</span>
            <span className="hidden sm:block">{label}</span>
          </button>
        </li>
      ))}
    </ol>
  </nav>
)

interface CatalogQuery {
  data: { services: PublicService[] } | undefined
  isPending: boolean
  isError: boolean
  refetch: () => Promise<unknown>
}

const ServiceStep = ({
  catalog,
  selectedId,
  onSelect,
}: {
  catalog: CatalogQuery
  selectedId: string
  onSelect: (service: PublicService) => void
}) => (
  <>
    <StepHeading eyebrow="Paso 1 de 5">¿Qué servicio quieres?</StepHeading>
    <p className="mt-3 text-sm text-lou-graphite/60">El precio mostrado es la referencia actual.</p>
    {catalog.isPending && (
      <p className="mt-6" role="status">
        Cargando servicios…
      </p>
    )}
    {catalog.isError && (
      <p className="mt-6" role="alert">
        No pudimos cargar los servicios.{' '}
        <button className="font-bold underline" onClick={() => void catalog.refetch()}>
          Reintentar
        </button>
      </p>
    )}
    <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Servicios">
      {catalog.data?.services.map((service, index) => {
        const selected = service.id === selectedId
        return (
          <button
            className={cn(
              'relative min-h-39 overflow-hidden rounded-2xl border p-5 text-left transition-[translate,border-color,background-color,box-shadow] duration-300 ease-lou hover:-translate-y-0.5',
              selected
                ? 'border-lou-ink bg-lou-ink text-white shadow-lou-md'
                : 'border-lou-fog bg-lou-paper/60 hover:border-lou-steel hover:bg-white hover:shadow-lou-sm',
            )}
            type="button"
            role="radio"
            aria-checked={selected}
            key={service.id}
            onClick={() => onSelect(service)}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="font-display text-3xl leading-none font-bold">{service.name}</span>
              <span className="font-display text-xl font-bold tabular-nums">0{index + 1}</span>
            </span>
            <span
              className={cn(
                'mt-4 block text-xs leading-5',
                selected ? 'text-white/60' : 'text-lou-graphite/55',
              )}
            >
              {service.description ?? 'Servicio de Lou Barbershop.'}
            </span>
            <span className="mt-4 flex items-center justify-between border-t border-current/15 pt-3 text-sm font-bold">
              <span>{service.durationMinutes} min</span>
              <span>{centsToBolivianos(service.priceCents)}</span>
            </span>
          </button>
        )
      })}
    </div>
  </>
)

const BarberStep = ({
  barbers,
  selectedId,
  onSelect,
}: {
  barbers: PublicBarber[]
  selectedId: string
  onSelect: (barber?: PublicBarber) => void
}) => (
  <>
    <StepHeading eyebrow="Paso 2 de 5">¿Con quién te atiendes?</StepHeading>
    <p className="mt-3 text-sm text-lou-graphite/60">
      Si no tienes preferencia, encontraremos el primer horario libre.
    </p>
    <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Barberos">
      <BarberChoice
        name="Cualquier barbero"
        description="La opción con más horarios disponibles."
        selected={selectedId === 'any'}
        onClick={() => onSelect()}
      />
      {barbers.map((barber) => (
        <BarberChoice
          key={barber.id}
          name={barber.displayName}
          description="Elegir este profesional."
          selected={selectedId === barber.id}
          onClick={() => onSelect(barber)}
        />
      ))}
    </div>
  </>
)

const BarberChoice = ({
  name,
  description,
  selected,
  onClick,
}: {
  name: string
  description: string
  selected: boolean
  onClick: () => void
}) => (
  <button
    className={cn(
      'flex min-h-24 items-center gap-4 rounded-2xl border p-4 text-left transition-[translate,border-color,background-color,box-shadow] duration-300 ease-lou hover:-translate-y-0.5',
      selected
        ? 'border-lou-ink bg-lou-ink text-white shadow-lou-md'
        : 'border-lou-fog bg-lou-paper/60 hover:border-lou-steel hover:bg-white',
    )}
    type="button"
    role="radio"
    aria-checked={selected}
    onClick={onClick}
  >
    <span
      className={cn(
        'grid size-12 shrink-0 place-items-center rounded-full',
        selected ? 'bg-white text-lou-ink' : 'bg-lou-ink text-white',
      )}
    >
      <AppIcon name="scissors" size={22} />
    </span>
    <span>
      <strong className="block font-display text-2xl leading-none">{name}</strong>
      <small className={cn('mt-1 block', selected ? 'text-white/60' : 'text-lou-graphite/55')}>
        {description}
      </small>
    </span>
  </button>
)

interface SlotsQuery {
  data: AvailabilitySlot[] | undefined
  isFetching: boolean
  isError: boolean
  refetch: () => Promise<unknown>
}

const ScheduleStep = ({
  date,
  onDateChange,
  slots,
  selectedSlot,
  onSelect,
  offline,
}: {
  date: string
  onDateChange: (date: string) => void
  slots: SlotsQuery
  selectedSlot: AvailabilitySlot | undefined
  onSelect: (slot: AvailabilitySlot) => void
  offline: boolean
}) => {
  const [period, setPeriod] = useState<'morning' | 'afternoon'>('morning')
  const [showAll, setShowAll] = useState(false)
  const quickDates = nextBookingDates(5)
  const uniqueSlots = Array.from(
    new Map((slots.data ?? []).map((item) => [agendaTime(item.startsAt), item])).values(),
  )
  const morningSlots = uniqueSlots.filter((item) => bookingHour(item.startsAt) < 12)
  const afternoonSlots = uniqueSlots.filter((item) => bookingHour(item.startsAt) >= 12)
  const activePeriod = period === 'morning' && morningSlots.length === 0 ? 'afternoon' : period
  const periodSlots = activePeriod === 'morning' ? morningSlots : afternoonSlots
  const visibleSlots = showAll ? periodSlots : periodSlots.slice(0, 8)

  return (
    <>
      <StepHeading eyebrow="Paso 3 de 5">Elige fecha y hora</StepHeading>
      <div className="mt-6 rounded-2xl border border-lou-fog bg-lou-paper/60 p-4 sm:p-5">
        <label className={labelClassName}>
          Selecciona una fecha
          <span className="relative block">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-lou-graphite/55">
              <AppIcon name="calendar" size={20} />
            </span>
            <input
              className={cn(fieldClassName, 'pl-12 font-semibold')}
              type="date"
              required
              min={todayInBusinessTime()}
              value={date}
              onChange={(event) => {
                setShowAll(false)
                onDateChange(event.target.value)
              }}
            />
          </span>
        </label>
        <div className="mt-4 grid grid-cols-5 gap-1.5" aria-label="Próximos días">
          {quickDates.map((item) => (
            <button
              className={cn(
                'grid min-h-14 place-content-center rounded-xl border px-1 text-center transition-colors',
                date === item.value
                  ? 'border-lou-ink bg-lou-ink text-white'
                  : 'border-lou-fog bg-white text-lou-ink hover:border-lou-steel',
              )}
              type="button"
              key={item.value}
              aria-pressed={date === item.value}
              onClick={() => {
                setShowAll(false)
                onDateChange(item.value)
              }}
            >
              <span className="text-[0.62rem] font-bold uppercase opacity-60">{item.weekday}</span>
              <strong className="font-display text-xl leading-none">{item.day}</strong>
            </button>
          ))}
        </div>
      </div>
      {slots.isFetching && (
        <p className="mt-6" role="status">
          Buscando horarios disponibles…
        </p>
      )}
      {slots.isError && (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-lou-danger" role="alert">
          {offline
            ? 'Conéctate para consultar disponibilidad actual.'
            : 'No pudimos actualizar los horarios.'}{' '}
          {!offline && (
            <button className="font-bold underline" onClick={() => void slots.refetch()}>
              Reintentar
            </button>
          )}
        </p>
      )}
      {!slots.isFetching && slots.data?.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-lou-steel bg-lou-paper p-6 text-center text-sm text-lou-graphite/65">
          No hay horarios ese día. Prueba otra fecha o barbero.
        </p>
      )}
      {slots.data && slots.data.length > 0 && (
        <div className="mt-6">
          <div
            className="grid grid-cols-2 rounded-xl bg-lou-fog/70 p-1"
            role="tablist"
            aria-label="Periodo del día"
          >
            <PeriodButton
              label="Mañana"
              count={morningSlots.length}
              selected={activePeriod === 'morning'}
              disabled={morningSlots.length === 0}
              onClick={() => {
                setShowAll(false)
                setPeriod('morning')
              }}
            />
            <PeriodButton
              label="Tarde"
              count={afternoonSlots.length}
              selected={activePeriod === 'afternoon'}
              disabled={afternoonSlots.length === 0}
              onClick={() => {
                setShowAll(false)
                setPeriod('afternoon')
              }}
            />
          </div>
          <div
            className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4"
            role="radiogroup"
            aria-label={`Horarios de ${activePeriod === 'morning' ? 'la mañana' : 'la tarde'}`}
          >
            {visibleSlots.map((item) => {
              const selected =
                selectedSlot?.barberId === item.barberId && selectedSlot.startsAt === item.startsAt
              return (
                <button
                  className={cn(
                    'grid min-h-18 place-content-center rounded-xl border px-3 py-2 text-center transition-[translate,border-color,background-color,color,box-shadow] duration-300 ease-lou hover:-translate-y-0.5',
                    selected
                      ? 'border-lou-ink bg-lou-ink text-white shadow-lou-md'
                      : 'border-lou-fog bg-white hover:border-lou-steel hover:shadow-lou-sm',
                  )}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  key={`${item.barberId}-${item.startsAt}`}
                  onClick={() => onSelect(item)}
                >
                  <strong className="font-display text-2xl leading-none">
                    {agendaTime(item.startsAt)}
                  </strong>
                  <small className="mt-1 font-semibold opacity-60">{item.barberName}</small>
                </button>
              )
            })}
          </div>
          {!showAll && periodSlots.length > visibleSlots.length && (
            <Button
              className="mt-3"
              variant="secondary"
              width="full"
              onClick={() => setShowAll(true)}
            >
              Ver {periodSlots.length - visibleSlots.length} horarios más
            </Button>
          )}
        </div>
      )}
      {offline && slots.data && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          Estos horarios estaban guardados y pueden estar desactualizados. Conéctate antes de
          confirmar.
        </p>
      )}
    </>
  )
}

const PeriodButton = ({
  label,
  count,
  selected,
  disabled,
  onClick,
}: {
  label: string
  count: number
  selected: boolean
  disabled: boolean
  onClick: () => void
}) => (
  <button
    className={cn(
      'min-h-10 rounded-lg px-3 text-sm font-bold transition-[background-color,color,box-shadow]',
      selected ? 'bg-white text-lou-ink shadow-sm' : 'text-lou-graphite/55',
    )}
    type="button"
    role="tab"
    aria-selected={selected}
    disabled={disabled}
    onClick={onClick}
  >
    {label} <span className="ml-1 opacity-50">{count}</span>
  </button>
)

const CustomerStep = ({
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
  <>
    <StepHeading eyebrow="Paso 4 de 5">¿A nombre de quién?</StepHeading>
    <p className="mt-3 text-sm text-lou-graphite/60">
      No necesitas cuenta. Usaremos estos datos sólo para tu cita.
    </p>
    <div className="mt-6 grid gap-5">
      <label className={labelClassName}>
        Nombre
        <input
          className={fieldClassName}
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
          autoComplete="tel"
          inputMode="tel"
          required
          value={phone}
          onChange={(event) => onPhoneChange(event.target.value)}
        />
      </label>
      <label className="flex items-start gap-3 rounded-xl bg-lou-paper p-4 text-sm leading-6">
        <input
          className="mt-1 size-5 accent-lou-ink"
          type="checkbox"
          required
          checked={privacyAccepted}
          onChange={(event) => onPrivacyChange(event.target.checked)}
        />
        <span>Autorizo usar mi nombre y teléfono únicamente para gestionar esta cita.</span>
      </label>
    </div>
  </>
)

const ReviewStep = ({
  serviceName,
  slot,
  displayName,
}: {
  serviceName: string
  slot: AvailabilitySlot
  displayName: string
}) => (
  <>
    <StepHeading eyebrow="Paso 5 de 5">Revisa antes de confirmar</StepHeading>
    <p className="mt-3 text-sm text-lou-graphite/60">
      El horario se valida nuevamente al confirmar.
    </p>
    <dl className="mt-6 divide-y divide-lou-fog overflow-hidden rounded-2xl border border-lou-fog bg-lou-paper/60">
      <ReviewRow label="Cliente" value={displayName} />
      <ReviewRow label="Servicio" value={serviceName} />
      <ReviewRow label="Profesional" value={slot.barberName} />
      <ReviewRow label="Fecha y hora" value={formatBookingDate(slot.startsAt)} />
      <ReviewRow label="Duración" value={`${slot.durationMinutes} min`} />
      <ReviewRow label="Total" value={centsToBolivianos(slot.priceCents)} strong />
    </dl>
  </>
)

const ReviewRow = ({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) => (
  <div className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_1fr] sm:items-center">
    <dt className="text-xs font-bold tracking-wider text-lou-graphite/45 uppercase">{label}</dt>
    <dd
      className={cn(
        'm-0 text-sm sm:text-right',
        strong ? 'font-display text-2xl font-bold' : 'font-semibold',
      )}
    >
      {value}
    </dd>
  </div>
)

const BookingSummary = ({
  service,
  barberName,
  date,
  slot,
}: {
  service: PublicService | undefined
  barberName: string | undefined
  date: string
  slot: AvailabilitySlot | undefined
}) => {
  const content = (
    <dl className="mt-4 grid gap-4">
      <SummaryItem label="Servicio" value={service?.name ?? 'Por elegir'} />
      <SummaryItem
        label="Barbero"
        value={slot?.barberName ?? barberName ?? 'Cualquier disponible'}
      />
      <SummaryItem
        label="Fecha"
        value={slot ? formatBookingDate(slot.startsAt) : formatCalendarDate(date)}
      />
      <SummaryItem
        label="Precio"
        value={
          slot
            ? centsToBolivianos(slot.priceCents)
            : service
              ? centsToBolivianos(service.priceCents)
              : '—'
        }
      />
    </dl>
  )
  return (
    <aside
      className="order-first lg:order-none lg:sticky lg:top-24"
      aria-label="Resumen de reserva"
    >
      <details className="group rounded-2xl border border-lou-fog bg-lou-ink text-white shadow-lou-md lg:hidden">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 px-4 font-bold">
          <span>
            <small className="block text-[0.62rem] tracking-[0.14em] text-white/45 uppercase">
              Tu selección
            </small>
            Resumen de reserva
          </span>
          <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-white px-3 text-xs text-lou-ink shadow-sm">
            <span className="group-open:hidden">Ver resumen</span>
            <span className="hidden group-open:inline">Ocultar</span>
            <span className="transition-transform duration-200 group-open:rotate-180">
              <AppIcon name="chevron-down" size={16} />
            </span>
          </span>
        </summary>
        <div className="border-t border-white/10 px-5 pb-5">{content}</div>
      </details>
      <div className="hidden rounded-2xl bg-lou-ink p-6 text-white shadow-lou-lg lg:block">
        <p className="text-xs font-bold tracking-[0.18em] text-white/45 uppercase">Tu selección</p>
        <h2 className="mt-2 font-display text-3xl font-bold">Resumen de reserva</h2>
        {content}
        <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">
          Nada se reserva hasta que confirmes el último paso.
        </p>
      </div>
    </aside>
  )
}

const SummaryItem = ({ label, value }: { label: string; value: string }) => (
  <div>
    <dt className="text-[0.65rem] font-bold tracking-wider text-white/40 uppercase">{label}</dt>
    <dd className="mt-1 font-semibold text-white/85">{value}</dd>
  </div>
)

const InlineError = ({ children }: { children: ReactNode }) => (
  <p
    className="mt-5 rounded-xl border border-lou-danger/20 bg-red-50 p-4 text-sm font-semibold text-lou-danger"
    role="alert"
  >
    {children}
  </p>
)

const BookingSuccess = ({ confirmation }: { confirmation: PublicBookingConfirmation }) => {
  const appointment = confirmation.appointment
  return (
    <main className="bg-lou-paper px-4 py-12 sm:px-6 lg:py-20">
      <div className="mx-auto w-full max-w-4xl text-center">
        <m.div
          className="mx-auto grid size-18 place-items-center rounded-full bg-emerald-700 text-white shadow-lou-lg"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
        >
          <AppIcon name="check" size={34} />
        </m.div>
        <p className="mt-6 text-xs font-bold tracking-[0.2em] text-emerald-800 uppercase">
          Reserva confirmada
        </p>
        <h1 className="mt-3 font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
          Te esperamos, {appointment.customerName}.
        </h1>
        <div className="text-left">
          <AppointmentSummary appointment={appointment} />
        </div>
        <div className="mt-6 rounded-2xl bg-lou-charcoal p-6 text-left text-white shadow-lou-lg sm:p-8">
          <strong className="font-display text-3xl">Guarda tu enlace privado</strong>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
            Lo necesitarás para consultar, cambiar o cancelar esta cita. No lo compartas.
          </p>
          <Link
            className={cn(buttonStyles({ variant: 'secondary' }), 'mt-5')}
            to={confirmation.managementPath}
            viewTransition
          >
            <AppIcon name="calendar" size={18} />
            Gestionar mi cita
          </Link>
        </div>
        <Link
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold hover:underline"
          to="/reservar"
          viewTransition
        >
          Reservar otra cita <AppIcon name="arrow-right" size={18} />
        </Link>
      </div>
    </main>
  )
}

const formatBookingDate = (startsAt: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(startsAt))

const formatCalendarDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T00:00:00Z`))

const bookingHour = (startsAt: string) =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      hour12: false,
    }).format(new Date(startsAt)),
  )

const nextBookingDates = (count: number) => {
  const first = new Date(`${todayInBusinessTime()}T00:00:00Z`)
  return Array.from({ length: count }, (_, index) => {
    const current = new Date(first)
    current.setUTCDate(first.getUTCDate() + index)
    return {
      value: current.toISOString().slice(0, 10),
      weekday: new Intl.DateTimeFormat('es-BO', { weekday: 'short', timeZone: 'UTC' })
        .format(current)
        .replace('.', ''),
      day: current.getUTCDate(),
    }
  })
}

interface SummaryAppointment {
  serviceName: string
  barberName: string
  startsAt: string
  durationMinutes: number
  priceCents: number
}

export const AppointmentSummary = ({ appointment }: { appointment: SummaryAppointment }) => (
  <dl className="mt-8 grid overflow-hidden rounded-2xl border border-lou-fog bg-white shadow-lou-sm sm:grid-cols-2">
    <div className="border-b border-lou-fog p-5 sm:border-r">
      <dt className="text-xs font-bold tracking-wider text-lou-graphite/45 uppercase">Servicio</dt>
      <dd className="mt-1 font-display text-2xl font-bold">{appointment.serviceName}</dd>
    </div>
    <div className="border-b border-lou-fog p-5">
      <dt className="text-xs font-bold tracking-wider text-lou-graphite/45 uppercase">Barbero</dt>
      <dd className="mt-1 font-display text-2xl font-bold">{appointment.barberName}</dd>
    </div>
    <div className="border-b border-lou-fog p-5 sm:border-r sm:border-b-0">
      <dt className="text-xs font-bold tracking-wider text-lou-graphite/45 uppercase">
        Fecha y hora
      </dt>
      <dd className="mt-1 text-sm font-semibold">{formatBookingDate(appointment.startsAt)}</dd>
    </div>
    <div className="p-5">
      <dt className="text-xs font-bold tracking-wider text-lou-graphite/45 uppercase">
        Duración y precio
      </dt>
      <dd className="mt-1 font-display text-2xl font-bold tabular-nums">
        {appointment.durationMinutes} min · {centsToBolivianos(appointment.priceCents)}
      </dd>
    </div>
  </dl>
)
