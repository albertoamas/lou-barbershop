import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  appointmentCountdown,
  appointmentStatusLabel,
  datesWithSlots,
  daySlots,
  managementTokenFromHash,
  managementTokenFromInput,
  monthOf,
  monthRange,
  shiftMonth,
  slotDate,
  type PublicAppointment,
  type PublicAppointmentStatus,
  type PublicBookingConfirmation,
} from '../../core/public-booking/PublicBooking'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { ApiError } from '../../infrastructure/http/apiClient'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import {
  BarberPicker,
  MonthCalendar,
  ServicePicker,
  SlotPicker,
} from '../components/booking/BookingSteps'
import { calendarFileHref } from '../components/booking/calendarLink'
import { buttonStyles } from '../components/buttonStyles'
import { publicSite } from '../content/publicSite'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  successClassName,
  warningClassName,
} from '../styles/formStyles'

const monthsAhead = 3

const longDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00Z`))

const statusTone: Record<PublicAppointmentStatus, string> = {
  CONFIRMED: 'bg-ink text-on-ink',
  CHECKED_IN: 'bg-info-soft text-info-ink',
  IN_SERVICE: 'bg-ink text-on-ink',
  COMPLETED: 'bg-success-soft text-success-ink',
  CANCELLED: 'bg-danger-soft text-danger-ink',
  NO_SHOW: 'bg-danger-soft text-danger-ink',
}

export const PublicManageBookingPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const token = managementTokenFromHash(location.hash)
  const online = useConnectivity() === 'online'
  const client = useQueryClient()
  const today = todayInBusinessTime()
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)

  const appointment = useQuery({
    queryKey: ['public-booking', 'manage', token],
    queryFn: () => publicBookingApi.read(token),
    enabled: Boolean(token),
    retry: false,
    networkMode: 'always',
  })

  const openManagementLink = (input: string) => {
    const nextToken = managementTokenFromInput(input)
    if (!nextToken) return false
    setNotice('')
    void navigate(`/mi-cita#${nextToken}`, { replace: true })
    return true
  }

  const reschedule = async (current: PublicAppointment, slot: AvailabilitySlot) => {
    if (!online) return
    setBusy(true)
    setError('')
    try {
      const changed: PublicBookingConfirmation = await publicBookingApi.reschedule(
        token,
        current,
        slot,
      )
      client.setQueryData(
        ['public-booking', 'manage', changed.managementToken],
        changed.appointment,
      )
      void navigate(changed.managementPath, { replace: true })
      setEditing(false)
      setNotice('Listo, cambiamos tu cita. Tu enlace privado se renovó: guarda esta página.')
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.problem.detail ?? caught.message)
          : 'No pudimos cambiar la cita. Revisa tu conexión e inténtalo de nuevo.',
      )
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (current: PublicAppointment) => {
    if (!online) return
    setBusy(true)
    setError('')
    try {
      const cancelled = await publicBookingApi.cancel(token, current)
      client.setQueryData(['public-booking', 'manage', token], cancelled)
      setNotice('')
    } catch (caught) {
      setError(
        caught instanceof ApiError
          ? (caught.problem.detail ?? caught.message)
          : 'No pudimos cancelar la cita. Revisa tu conexión e inténtalo de nuevo.',
      )
    } finally {
      setBusy(false)
      setConfirmingCancel(false)
    }
  }

  if (!token) return <ManagementAccess onOpen={openManagementLink} />
  if (appointment.isError) return <ManagementAccess invalidLink onOpen={openManagementLink} />

  const data = appointment.data
  const managementUrl = new URL(`/mi-cita#${token}`, window.location.origin).toString()

  return (
    <main className="bg-paper-warm px-4 pt-6 pb-10 sm:px-6 lg:pt-10">
      <div className="mx-auto grid w-full max-w-3xl grid-cols-[minmax(0,1fr)] gap-5">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-5xl leading-none font-extrabold sm:text-6xl">Mi cita</h1>
          {data && (
            <span
              className={cn(
                'inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 font-semibold',
                statusTone[data.status],
              )}
            >
              {data.status === 'CONFIRMED' && <AppIcon name="check" size={16} />}
              {appointmentStatusLabel[data.status]}
            </span>
          )}
        </header>

        {!online && (
          <p className={warningClassName} role="status">
            Sin conexión. Puedes ver tu cita, pero no cambiarla ni cancelarla hasta volver a
            conectarte.
          </p>
        )}
        {notice && (
          <p className={successClassName} role="status">
            {notice}
          </p>
        )}

        {appointment.isPending && (
          <div className="grid gap-3" role="status" aria-label="Cargando tu cita">
            <div className="h-56 animate-pulse rounded-sheet bg-surface-strong" />
            <div className="h-14 animate-pulse rounded-control bg-surface-strong" />
          </div>
        )}

        {data && (
          <m.section
            className={cn(
              'rounded-sheet bg-surface p-6 shadow-raised sm:p-8',
              data.status === 'CANCELLED' && 'opacity-80',
            )}
            aria-labelledby="appointment-day"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {data.status === 'CONFIRMED' && (
              <p className="font-semibold text-success-ink">
                {appointmentCountdown(today, slotDate(data)) ?? 'Cita pasada'}
              </p>
            )}
            <h2
              id="appointment-day"
              className={cn(
                'mt-1 font-display text-[clamp(2.5rem,10vw,4rem)] leading-[0.95] font-extrabold first-letter:uppercase',
                data.status === 'CANCELLED' && 'line-through decoration-2',
              )}
            >
              {longDate(slotDate(data))}
            </h2>
            <p className="mt-2 font-display text-3xl font-extrabold tabular-nums">
              {agendaTime(data.startsAt)} a {agendaTime(data.endsAt)}
            </p>
            <p className="mt-3 text-lg text-pretty text-ink-soft">
              {data.serviceName} con {data.barberName}, {centsToBolivianos(data.priceCents)}.
            </p>

            {data.status === 'CONFIRMED' && (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  className={buttonStyles({ variant: 'secondary' })}
                  href={calendarFileHref(data, managementUrl)}
                  download="cita-lou-barbershop.ics"
                >
                  <AppIcon name="calendar" size={20} />
                  Guardar en mi calendario
                </a>
                <a
                  className={buttonStyles({ variant: 'secondary' })}
                  href={publicSite.mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <AppIcon name="map-pin" size={20} />
                  Cómo llegar
                </a>
                {publicSite.whatsappUrl && (
                  <a
                    className={buttonStyles({ variant: 'secondary' })}
                    href={publicSite.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Escribir a la barbería
                  </a>
                )}
              </div>
            )}

            {data.status === 'CANCELLED' && (
              <div className="mt-6 grid gap-3">
                <p className="text-lg">Esta cita está cancelada y ese horario quedó libre.</p>
                <Link
                  className={cn(buttonStyles({ size: 'lg' }), 'w-full sm:w-fit')}
                  to="/reservar"
                  viewTransition
                >
                  Reservar otra cita
                </Link>
              </div>
            )}
          </m.section>
        )}

        {data?.status === 'CONFIRMED' && !editing && (
          <section
            className="grid gap-3 rounded-sheet bg-surface p-6 shadow-raised sm:p-8"
            aria-labelledby="change-title"
          >
            <h2 id="change-title" className="font-display text-3xl font-extrabold">
              ¿Necesitas cambiarla?
            </h2>
            <Button
              size="lg"
              className="w-full sm:w-fit"
              disabled={!online || busy}
              onClick={() => {
                setEditing(true)
                setNotice('')
                setError('')
              }}
            >
              <AppIcon name="calendar" size={20} />
              Cambiar día u hora
            </Button>
            <button
              type="button"
              className="inline-flex min-h-11 w-fit items-center px-1 font-semibold text-danger-ink underline underline-offset-4 hover:no-underline disabled:opacity-50"
              disabled={!online || busy}
              onClick={() => setConfirmingCancel(true)}
            >
              Cancelar cita
            </button>
            {error && (
              <p className={errorClassName} role="alert">
                {error}
              </p>
            )}
          </section>
        )}

        <AnimatePresence initial={false}>
          {data?.status === 'CONFIRMED' && editing && (
            <m.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25 }}
            >
              <Reschedule
                appointment={data}
                today={today}
                online={online}
                busy={busy}
                error={error}
                onCancel={() => {
                  setEditing(false)
                  setError('')
                }}
                onConfirm={(slot) => void reschedule(data, slot)}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {confirmingCancel && data && (
        <ConfirmDialog
          busy={busy}
          title="¿Cancelar tu cita?"
          confirmLabel="Sí, cancelar cita"
          cancelLabel="No, conservarla"
          onCancel={() => setConfirmingCancel(false)}
          onConfirm={() => void cancel(data)}
        >
          {`Tu cita del ${longDate(slotDate(data))} a las ${agendaTime(data.startsAt)}. El horario volverá a quedar libre y no podrás recuperarlo desde este enlace.`}
        </ConfirmDialog>
      )}
    </main>
  )
}

// Choosing a new day and time with the same calendar as the booking.
const Reschedule = ({
  appointment,
  today,
  online,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  appointment: PublicAppointment
  today: string
  online: boolean
  busy: boolean
  error: string
  onCancel: () => void
  onConfirm: (slot: AvailabilitySlot) => void
}) => {
  const [serviceId, setServiceId] = useState(appointment.serviceId)
  const [barberId, setBarberId] = useState(appointment.barberId)
  const [changingService, setChangingService] = useState(false)
  const [month, setMonth] = useState(() => {
    const current = monthOf(slotDate(appointment))
    return current < monthOf(today) ? monthOf(today) : current
  })
  const [chosenDate, setChosenDate] = useState('')
  const [slot, setSlot] = useState<AvailabilitySlot>()

  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    networkMode: 'always',
  })
  const { first, last } = monthRange(month)
  const rangeFrom = first < today ? today : first
  const slots = useQuery({
    queryKey: ['public-booking', 'availability', serviceId, barberId, rangeFrom, last],
    networkMode: 'always',
    retry: false,
    queryFn: () => publicBookingApi.availabilityRange(serviceId, barberId, rangeFrom, last),
  })
  // The current appointment's own time is not offered as a change.
  const offered = slots.data?.filter((item) => item.startsAt !== appointment.startsAt)
  const available = offered ? datesWithSlots(offered) : undefined
  const firstFree = available ? [...available].sort()[0] : undefined
  const date = chosenDate && monthOf(chosenDate) === month ? chosenDate : (firstFree ?? rangeFrom)
  const { morning, afternoon } = daySlots(offered, date)
  const service = catalog.data?.services.find((item) => item.id === serviceId)
  const resetSlot = () => setSlot(undefined)

  return (
    <section
      className="rounded-sheet bg-surface p-5 shadow-raised sm:p-8"
      aria-labelledby="reschedule-title"
    >
      <h2 id="reschedule-title" className="font-display text-4xl leading-none font-extrabold">
        Elige el nuevo horario
      </h2>
      <p className="mt-2 text-lg text-ink-soft">
        Tu cita actual se mantiene hasta que confirmes el cambio.
      </p>

      <div className="mt-6 grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-paper-warm px-4 py-3">
          <span>
            <span className="block text-sm text-ink-soft">Servicio</span>
            <span className="font-semibold">{service?.name ?? appointment.serviceName}</span>
          </span>
          <button
            type="button"
            className="min-h-11 px-2 font-semibold underline underline-offset-4 hover:no-underline"
            aria-expanded={changingService}
            onClick={() => setChangingService((value) => !value)}
          >
            {changingService ? 'Mantener servicio' : 'Cambiar servicio'}
          </button>
        </div>
        {changingService && catalog.data && (
          <ServicePicker
            services={catalog.data.services}
            selectedId={serviceId}
            onSelect={(next) => {
              setServiceId(next.id)
              setChangingService(false)
              resetSlot()
            }}
          />
        )}

        <section aria-labelledby="reschedule-barber">
          <h3 id="reschedule-barber" className="mb-2 text-lg font-semibold text-ink-soft">
            Barbero
          </h3>
          <BarberPicker
            barbers={catalog.data?.barbers ?? []}
            selectedId={barberId}
            onSelect={(next) => {
              setBarberId(next)
              resetSlot()
            }}
          />
        </section>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <MonthCalendar
            month={month}
            today={today}
            selected={date}
            available={available}
            canGoBack={month > monthOf(today)}
            canGoForward={month < shiftMonth(monthOf(today), monthsAhead)}
            onMonthChange={(delta) => {
              setMonth(shiftMonth(month, delta))
              setChosenDate('')
              resetSlot()
            }}
            onSelect={(next) => {
              setChosenDate(next)
              resetSlot()
            }}
          />
          <div aria-live="polite">
            <h3 className="mb-3 font-display text-2xl font-extrabold first-letter:uppercase">
              Hora para el {longDate(date)}
            </h3>
            {slots.isPending && (
              <div className="grid grid-cols-3 gap-2" role="status" aria-label="Buscando horarios">
                {[0, 1, 2, 3, 4, 5].map((item) => (
                  <div key={item} className="h-14 animate-pulse rounded-control bg-surface-muted" />
                ))}
              </div>
            )}
            {slots.isError && (
              <p className={errorClassName} role="alert">
                No pudimos cargar los horarios. Revisa tu conexión.
              </p>
            )}
            {offered &&
              (morning.length + afternoon.length === 0 ? (
                <p className="rounded-control bg-surface-muted p-5 text-ink-soft">
                  No hay horarios libres ese día. Elige otro en el calendario.
                </p>
              ) : (
                <SlotPicker
                  morning={morning}
                  afternoon={afternoon}
                  selected={slot}
                  showBarber={barberId === 'any'}
                  onSelect={setSlot}
                />
              ))}
          </div>
        </div>
      </div>

      <div className="sticky bottom-[env(safe-area-inset-bottom)] z-20 -mx-5 mt-8 -mb-5 grid grid-cols-[minmax(0,1fr)] gap-3 rounded-b-sheet border-t border-surface-strong bg-surface/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:-mb-8 sm:px-8">
        {error && (
          <p className={errorClassName} role="alert">
            {error}
          </p>
        )}
        <p className="truncate font-semibold" aria-live="polite">
          {slot
            ? `Nuevo horario: ${longDate(slotDate(slot))}, ${agendaTime(slot.startsAt)}`
            : 'Elige un día y una hora.'}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" size="lg" disabled={busy} onClick={onCancel}>
            Conservar mi cita
          </Button>
          <Button
            size="lg"
            disabled={!slot || !online || busy}
            onClick={() => slot && onConfirm(slot)}
          >
            {busy ? 'Guardando' : 'Confirmar cambio'}
          </Button>
        </div>
      </div>
    </section>
  )
}

const ManagementAccess = ({
  invalidLink = false,
  onOpen,
}: {
  invalidLink?: boolean
  onOpen: (input: string) => boolean
}) => {
  const [input, setInput] = useState('')
  const [validation, setValidation] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!onOpen(input)) setValidation('Pega el enlace completo que recibiste al reservar.')
  }

  return (
    <main className="bg-paper-warm px-4 pt-6 pb-10 sm:px-6 lg:pt-10">
      <div className="mx-auto grid w-full max-w-xl gap-5">
        <h1 className="font-display text-5xl leading-none font-extrabold sm:text-6xl">Mi cita</h1>
        <p className="text-lg text-pretty text-ink-soft">
          Abre el enlace privado que recibiste al reservar. Por seguridad no buscamos citas por
          nombre ni teléfono.
        </p>
        <form className="grid gap-4 rounded-sheet bg-surface p-6 shadow-raised" onSubmit={submit}>
          {invalidLink && (
            <p className={errorClassName} role="alert">
              Ese enlace no es válido, ya venció o la cita dejó de estar disponible.
            </p>
          )}
          <label className={labelClassName}>
            Tu enlace privado
            <input
              className={fieldClassName}
              name="management-link"
              autoComplete="off"
              spellCheck={false}
              placeholder="Pega aquí el enlace de tu reserva"
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                setValidation('')
              }}
            />
          </label>
          {validation && (
            <p className={errorClassName} role="alert">
              {validation}
            </p>
          )}
          <Button size="lg" width="full" type="submit">
            Abrir mi cita
          </Button>
        </form>
        <div className="grid gap-2 rounded-sheet bg-surface p-6 shadow-raised">
          <h2 className="font-display text-2xl font-extrabold">¿Perdiste el enlace?</h2>
          <p className="text-ink-soft">
            {publicSite.whatsappUrl
              ? 'Escríbenos y te ayudamos a encontrar tu cita, o reserva una nueva.'
              : 'Pide ayuda en la barbería para encontrar tu cita, o reserva una nueva.'}
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            {publicSite.whatsappUrl && (
              <a
                className={buttonStyles({ variant: 'secondary' })}
                href={publicSite.whatsappUrl}
                target="_blank"
                rel="noreferrer"
              >
                Escribir a la barbería
              </a>
            )}
            <Link className={buttonStyles({ variant: 'secondary' })} to="/reservar" viewTransition>
              Reservar una cita
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
