import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  bookingDays,
  bookingWindowDays,
  datesWithSlots,
  daySlots,
  type PublicBookingConfirmation,
} from '../../core/public-booking/PublicBooking'
import {
  addCalendarDays,
  todayInBusinessTime,
  type AvailabilitySlot,
} from '../../core/scheduling/Scheduling'
import { ApiError } from '../../infrastructure/http/apiClient'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { BookingProgress } from '../components/booking/BookingProgress'
import {
  BarberPicker,
  CustomerForm,
  DayPicker,
  ReviewList,
  ServicePicker,
  SlotPicker,
  StepHeading,
} from '../components/booking/BookingSteps'
import { BookingSuccess } from '../components/booking/BookingSuccess'
import { bookingDateTime, bookingSteps, shortDay } from '../components/booking/bookingFormat'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

const lastStep = bookingSteps.length - 1

export const PublicBookingPage = () => {
  const online = useConnectivity() === 'online'
  const today = todayInBusinessTime()
  const days = bookingDays(today)
  // The home links here with the service or barber already chosen.
  const [params] = useSearchParams()
  const [step, setStep] = useState(() => (params.get('servicio') ? 1 : 0))
  const [direction, setDirection] = useState(1)
  const [serviceId, setServiceId] = useState(() => params.get('servicio') ?? '')
  const [barberId, setBarberId] = useState(() => params.get('barbero') ?? 'any')
  // Empty until the customer picks a day: the first day with free times is preselected.
  const [chosenDate, setChosenDate] = useState('')
  const [slot, setSlot] = useState<AvailabilitySlot>()
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [confirmation, setConfirmation] = useState<PublicBookingConfirmation>()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')

  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })
  const inWindow = !chosenDate || days.includes(chosenDate)
  const rangeFrom = inWindow ? today : chosenDate
  const rangeTo = inWindow ? addCalendarDays(today, bookingWindowDays - 1) : chosenDate
  // One request covers the whole two-week strip, so days without times show as such.
  const slots = useQuery({
    queryKey: ['public-booking', 'availability', serviceId, barberId, rangeFrom, rangeTo],
    enabled: step >= 2 && Boolean(serviceId),
    networkMode: 'always',
    retry: false,
    queryFn: () => publicBookingApi.availabilityRange(serviceId, barberId, rangeFrom, rangeTo),
  })
  const available = slots.data ? datesWithSlots(slots.data) : undefined
  const date = chosenDate || days.find((day) => available?.has(day)) || today
  const { morning, afternoon } = daySlots(slots.data, date)
  const service = catalog.data?.services.find((item) => item.id === serviceId)
  const barber = catalog.data?.barbers.find((item) => item.id === barberId)

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setNotice('')
    setStep(next)
  }

  const missing = (): string => {
    if (step === 0 && !service) return 'Elige un servicio para continuar.'
    if (step === 2 && !slot) return 'Elige una hora libre para continuar.'
    if (step === 3) {
      if (displayName.trim().length < 2) return 'Escribe tu nombre.'
      if (phone.trim().length < 7) return 'Escribe un teléfono válido.'
      if (!privacyAccepted) return 'Necesitamos tu autorización para gestionar la cita.'
    }
    return ''
  }

  const advance = () => {
    // A link may name a service that is no longer offered: start again from the list.
    if (step > 0 && catalog.data && !service) {
      setServiceId('')
      goTo(0)
      setNotice('Ese servicio ya no está disponible. Elige otro para continuar.')
      return
    }
    const problem = missing()
    if (problem) return setNotice(problem)
    goTo(Math.min(step + 1, lastStep))
  }

  const confirm = async () => {
    if (!slot || !online || busy) return
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
      const taken = error instanceof ApiError && error.problem.status === 409
      if (taken) {
        setSlot(undefined)
        goTo(2)
        void slots.refetch()
      }
      setNotice(
        taken
          ? 'Alguien acaba de tomar ese horario. Elige otro, por favor.'
          : error instanceof ApiError
            ? (error.problem.detail ?? 'No pudimos confirmar la cita.')
            : 'No pudimos confirmar. Revisa tu conexión antes de volver a intentar.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (confirmation) return <BookingSuccess confirmation={confirmation} />

  const selection = [
    service?.name,
    step >= 2 ? (slot?.barberName ?? barber?.displayName) : barber?.displayName,
    slot
      ? `${shortDay(date)}, ${agendaTime(slot.startsAt)}`
      : step >= 2
        ? shortDay(date)
        : undefined,
  ].filter(Boolean)
  const price = slot?.priceCents ?? service?.priceCents

  return (
    <main className="bg-paper-warm px-4 pt-6 pb-10 sm:px-6 lg:pt-10">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-[minmax(0,1fr)] gap-5">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-5xl leading-none font-extrabold sm:text-6xl">
            Reservar
          </h1>
          {step > 0 && (
            <Button variant="ghost" className="-mr-3" onClick={() => goTo(step - 1)}>
              <AppIcon name="arrow-left" size={18} />
              Volver
            </Button>
          )}
        </header>
        <BookingProgress current={step} />

        <section className="relative min-w-0 rounded-sheet bg-surface p-5 shadow-raised sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={step}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: direction * -16 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <>
                  <StepHeading lead="Toca uno para seguir.">¿Qué servicio quieres?</StepHeading>
                  {catalog.isPending && (
                    <div className="grid gap-2" role="status" aria-label="Cargando servicios">
                      {[0, 1, 2].map((item) => (
                        <div
                          key={item}
                          className="h-20 animate-pulse rounded-control bg-surface-muted"
                        />
                      ))}
                    </div>
                  )}
                  {catalog.isError && (
                    <div
                      className={cn(
                        errorClassName,
                        'flex flex-wrap items-center justify-between gap-3',
                      )}
                      role="alert"
                    >
                      No pudimos cargar los servicios.
                      <Button variant="secondary" size="sm" onClick={() => void catalog.refetch()}>
                        Reintentar
                      </Button>
                    </div>
                  )}
                  {catalog.data && (
                    <ServicePicker
                      services={catalog.data.services}
                      selectedId={serviceId}
                      onSelect={(next) => {
                        if (next.id !== serviceId) setSlot(undefined)
                        setServiceId(next.id)
                        goTo(1)
                      }}
                    />
                  )}
                </>
              )}
              {step === 1 && (
                <>
                  <StepHeading lead="Toca uno para seguir.">¿Con quién te atiendes?</StepHeading>
                  <BarberPicker
                    barbers={catalog.data?.barbers ?? []}
                    selectedId={barberId}
                    onSelect={(next) => {
                      if (next !== barberId) setSlot(undefined)
                      setBarberId(next)
                      goTo(2)
                    }}
                  />
                </>
              )}
              {step === 2 && (
                <>
                  <StepHeading>Elige día y hora</StepHeading>
                  <DayPicker
                    days={days}
                    today={today}
                    selected={date}
                    available={available}
                    onSelect={(next) => {
                      setChosenDate(next)
                      setSlot(undefined)
                    }}
                  />
                  <div className="mt-6" aria-live="polite">
                    {slots.isPending && (
                      <div
                        className="grid grid-cols-3 gap-2"
                        role="status"
                        aria-label="Buscando horarios"
                      >
                        {[0, 1, 2, 3, 4, 5].map((item) => (
                          <div
                            key={item}
                            className="h-14 animate-pulse rounded-control bg-surface-muted"
                          />
                        ))}
                      </div>
                    )}
                    {slots.isError && (
                      <div
                        className={cn(
                          errorClassName,
                          'flex flex-wrap items-center justify-between gap-3',
                        )}
                        role="alert"
                      >
                        {online
                          ? 'No pudimos cargar los horarios.'
                          : 'Conéctate para ver los horarios libres.'}
                        {online && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void slots.refetch()}
                          >
                            Reintentar
                          </Button>
                        )}
                      </div>
                    )}
                    {slots.data &&
                      (morning.length + afternoon.length === 0 ? (
                        <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
                          No hay horarios libres el {shortDay(date)}. Prueba otro día
                          {barberId === 'any' ? '.' : ' o elige "Cualquiera" como barbero.'}
                        </p>
                      ) : (
                        <SlotPicker
                          morning={morning}
                          afternoon={afternoon}
                          selected={slot}
                          showBarber={barberId === 'any'}
                          onSelect={(next) => {
                            setSlot(next)
                            setNotice('')
                          }}
                        />
                      ))}
                    {!online && slots.data && (
                      <p className={cn(warningClassName, 'mt-4')}>
                        Estos horarios estaban guardados y pueden estar desactualizados. Conéctate
                        antes de confirmar.
                      </p>
                    )}
                  </div>
                </>
              )}
              {step === 3 && (
                <>
                  <StepHeading lead="No necesitas cuenta. Usamos estos datos solo para tu cita.">
                    ¿A nombre de quién?
                  </StepHeading>
                  <CustomerForm
                    displayName={displayName}
                    phone={phone}
                    privacyAccepted={privacyAccepted}
                    onDisplayNameChange={setDisplayName}
                    onPhoneChange={setPhone}
                    onPrivacyChange={setPrivacyAccepted}
                  />
                </>
              )}
              {step === 4 && slot && (
                <>
                  <StepHeading lead="El horario se vuelve a comprobar al confirmar.">
                    Revisa tu reserva
                  </StepHeading>
                  <ReviewList
                    onChange={goTo}
                    rows={[
                      { label: 'Servicio', value: service?.name ?? 'Servicio', step: 0 },
                      { label: 'Barbero', value: slot.barberName, step: 1 },
                      { label: 'Día y hora', value: bookingDateTime(slot.startsAt), step: 2 },
                      { label: 'Nombre', value: `${displayName.trim()}, ${phone.trim()}`, step: 3 },
                    ]}
                  />
                  <p className="mt-4 flex items-baseline justify-between gap-3 px-1">
                    <span className="text-lg font-semibold">Total, {slot.durationMinutes} min</span>
                    <span className="font-display text-4xl font-extrabold text-success-ink tabular-nums">
                      {centsToBolivianos(slot.priceCents)}
                    </span>
                  </p>
                </>
              )}
            </m.div>
          </AnimatePresence>

          {/* The selection so far and the next step, always within reach. Tapping a service
              already moves on, so the first step only shows it once one is chosen. */}
          {(step > 0 || service || notice) && (
            <div className="sticky bottom-[env(safe-area-inset-bottom)] z-20 -mx-5 mt-8 -mb-5 grid grid-cols-[minmax(0,1fr)] gap-3 rounded-b-sheet border-t border-surface-strong bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
              {notice && (
                <p className={errorClassName} role="alert">
                  {notice}
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
                <p className="min-w-0 flex-1" aria-live="polite">
                  <span className="block truncate font-semibold">
                    {selection.length > 0 ? selection.join(', ') : 'Elige un servicio'}
                  </span>
                  {price !== undefined && (
                    <span className="block text-success-ink tabular-nums">
                      {centsToBolivianos(price)}
                    </span>
                  )}
                </p>
                {step < lastStep ? (
                  <Button size="lg" className="max-sm:w-full" onClick={advance}>
                    Continuar
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    className="max-sm:w-full"
                    disabled={busy || !online}
                    onClick={() => void confirm()}
                  >
                    {busy
                      ? 'Confirmando'
                      : online
                        ? 'Confirmar reserva'
                        : 'Conéctate para confirmar'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
