import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import type { PublicBookingConfirmation } from '../../core/public-booking/PublicBooking'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { ApiError } from '../../infrastructure/http/apiClient'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { useConnectivity } from '../hooks/useConnectivity'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { cn } from '../styles/cn'
import { AppIcon } from '../components/AppIcon'

const fieldClassName =
  'min-h-12 w-full rounded-xl border border-lou-steel/60 bg-white px-4 text-base shadow-sm outline-none transition-[border-color,box-shadow] focus:border-lou-ink focus:ring-3 focus:ring-lou-ink/10'
const labelClassName = 'grid gap-2 text-sm font-bold text-lou-ink'
const cardClassName = 'rounded-2xl border border-lou-fog bg-white p-5 shadow-lou-sm sm:p-7'

export const PublicBookingPage = () => {
  const connectivity = useConnectivity()
  const [serviceId, setServiceId] = useState('')
  const [barberId, setBarberId] = useState('any')
  const [date, setDate] = useState(todayInBusinessTime())
  const [search, setSearch] = useState<{ serviceId: string; barberId: string; date: string }>()
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
  const slots = useQuery({
    queryKey: ['public-booking', 'availability', search],
    enabled: Boolean(search),
    networkMode: 'always',
    retry: false,
    queryFn: () =>
      search
        ? publicBookingApi.availability(search.serviceId, search.barberId, search.date)
        : Promise.resolve([]),
  })

  const find = (event: FormEvent) => {
    event.preventDefault()
    setSlot(undefined)
    setNotice('')
    const next = { serviceId, barberId, date }
    if (JSON.stringify(search) === JSON.stringify(next)) void slots.refetch()
    setSearch(next)
  }
  const confirm = async (event: FormEvent) => {
    event.preventDefault()
    if (!slot || connectivity !== 'online' || busy) return
    setBusy(true)
    setNotice('')
    try {
      setConfirmation(
        await publicBookingApi.create({
          serviceId: slot.serviceId,
          barberId: slot.barberId,
          startsAt: slot.startsAt,
          displayName,
          phone,
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
        await slots.refetch()
      }
    } finally {
      setBusy(false)
    }
  }

  if (confirmation) {
    const appointment = confirmation.appointment
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-20">
        <p className="mb-3 text-xs font-bold tracking-[0.2em] text-emerald-800 uppercase">
          Reserva confirmada
        </p>
        <h1 className="m-0 max-w-3xl font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
          Te esperamos, {appointment.customerName}.
        </h1>
        <AppointmentSummary appointment={appointment} />
        <div className="mt-6 rounded-2xl bg-lou-charcoal p-6 text-white shadow-lou-lg sm:p-8">
          <strong className="font-display text-3xl">Guarda tu enlace privado</strong>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
            Lo necesitarás para consultar, cambiar o cancelar esta cita. No lo compartas.
          </p>
          <Link
            className={cn(buttonStyles({ variant: 'secondary' }), 'mt-5')}
            to={confirmation.managementPath}
            viewTransition
          >
            Administrar mi cita
          </Link>
        </div>
        <Link
          className="mt-6 inline-block text-sm font-bold hover:underline"
          to="/reservar"
          viewTransition
        >
          Reservar otra cita <AppIcon name="arrow-right" size={18} />
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:py-16">
      <header className="max-w-3xl">
        <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
          Reserva en línea
        </p>
        <h1 className="m-0 max-w-none font-display text-6xl leading-[0.88] font-bold sm:text-8xl">
          Reserva tu cita.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-lou-graphite/65">
          Tu próximo corte, sin vueltas. Elige servicio, barbero y horario; no necesitas crear una
          cuenta.
        </p>
      </header>
      <ol className="my-9 grid grid-cols-3 gap-2" aria-label="Progreso de reserva">
        <li
          className={cn(
            'border-t-2 pt-3 text-xs font-bold',
            slot ? 'border-emerald-700 text-emerald-800' : 'border-lou-ink text-lou-ink',
          )}
        >
          1. Horario
        </li>
        <li
          className={cn(
            'border-t-2 pt-3 text-xs font-bold',
            slot ? 'border-lou-ink text-lou-ink' : 'border-lou-fog text-lou-steel',
          )}
        >
          2. Tus datos
        </li>
        <li className="border-t-2 border-lou-fog pt-3 text-xs font-bold text-lou-steel">
          3. Confirmación
        </li>
      </ol>
      <section className={cardClassName} aria-labelledby="choose-slot">
        <h2 id="choose-slot" className="m-0 font-display text-4xl font-bold">
          Elige tu horario
        </h2>
        <form
          className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr_0.8fr_auto] lg:items-end"
          onSubmit={find}
        >
          <label className={labelClassName}>
            Servicio
            <select
              className={fieldClassName}
              required
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              <option value="">Selecciona un servicio</option>
              {catalog.data?.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {service.durationMinutes} min ·{' '}
                  {centsToBolivianos(service.priceCents)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClassName}>
            Barbero
            <select
              className={fieldClassName}
              value={barberId}
              onChange={(event) => setBarberId(event.target.value)}
            >
              <option value="any">Cualquier barbero disponible</option>
              {catalog.data?.barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClassName}>
            Día
            <input
              className={fieldClassName}
              type="date"
              required
              min={todayInBusinessTime()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <Button variant="secondary" disabled={!serviceId || catalog.isPending}>
            Buscar horarios
          </Button>
        </form>
        {catalog.isPending && <p role="status">Cargando servicios…</p>}
        {catalog.isError && (
          <p role="alert">
            No pudimos cargar los servicios.{' '}
            <button onClick={() => void catalog.refetch()}>Reintentar</button>
          </p>
        )}
        {search && slots.isFetching && <p role="status">Buscando horarios disponibles…</p>}
        {search && slots.isError && (
          <p role="alert">
            No pudimos actualizar los horarios.{' '}
            {connectivity === 'offline' ? (
              'Conéctate para consultar disponibilidad actual.'
            ) : (
              <button onClick={() => void slots.refetch()}>Reintentar</button>
            )}
          </p>
        )}
        {search && slots.data?.length === 0 && (
          <p className="mt-5 rounded-xl border border-dashed border-lou-steel bg-lou-paper p-6 text-center text-sm text-lou-graphite/65">
            No hay horarios ese día. Prueba otra fecha o barbero.
          </p>
        )}
        {slots.data && slots.data.length > 0 && (
          <div
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            role="group"
            aria-label="Horarios disponibles"
          >
            {slots.data.map((item) => (
              <button
                className={cn(
                  'grid min-h-24 gap-0.5 rounded-xl border border-lou-fog bg-white p-3 text-left shadow-sm transition-[transform,border-color,background-color,color] duration-150 hover:-translate-y-0.5 hover:border-lou-ink',
                  slot?.barberId === item.barberId &&
                    slot.startsAt === item.startsAt &&
                    'border-lou-ink bg-lou-ink text-white',
                )}
                type="button"
                aria-pressed={slot?.barberId === item.barberId && slot.startsAt === item.startsAt}
                key={`${item.barberId}-${item.startsAt}`}
                onClick={() => setSlot(item)}
              >
                <strong className="font-display text-2xl">{agendaTime(item.startsAt)}</strong>
                <span className="text-xs font-bold">{item.barberName}</span>
                <small className="text-[0.68rem] opacity-60">
                  {item.durationMinutes} min · {centsToBolivianos(item.priceCents)}
                </small>
              </button>
            ))}
          </div>
        )}
        {connectivity === 'offline' && slots.data && (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            Estos horarios estaban guardados y pueden estar desactualizados. Conéctate antes de
            confirmar.
          </p>
        )}
      </section>
      {slot && (
        <section className={cn(cardClassName, 'mt-5')} aria-labelledby="customer-data">
          <h2 id="customer-data" className="m-0 font-display text-4xl font-bold">
            Tus datos
          </h2>
          <p className="mt-2 text-sm text-lou-graphite/65">
            {agendaTime(slot.startsAt)} con {slot.barberName} · {centsToBolivianos(slot.priceCents)}
          </p>
          <form className="mt-6 grid gap-5" onSubmit={confirm}>
            <label className={labelClassName}>
              Nombre
              <input
                className={fieldClassName}
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
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
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="flex items-start gap-3 rounded-xl bg-lou-paper p-4 text-sm leading-6">
              <input
                className="mt-1 size-5 accent-lou-ink"
                type="checkbox"
                required
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
              />
              <span>Autorizo usar mi nombre y teléfono únicamente para gestionar esta cita.</span>
            </label>
            <Button width="full" disabled={busy || connectivity !== 'online' || !privacyAccepted}>
              {busy
                ? 'Confirmando…'
                : connectivity === 'offline'
                  ? 'Conéctate para confirmar'
                  : 'Confirmar reserva'}
            </Button>
          </form>
          {notice && (
            <p
              className="mt-4 rounded-xl border border-lou-danger/20 bg-red-50 p-4 text-sm font-semibold text-lou-danger"
              role="alert"
            >
              {notice}
            </p>
          )}
        </section>
      )}
      <p className="mt-8 text-center text-xs text-lou-graphite/50">
        Para cambiar una cita, abre el enlace privado que recibiste. ·{' '}
        <Link className="font-bold hover:underline" to="/app/login" viewTransition>
          Acceso del equipo
        </Link>
      </p>
    </main>
  )
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
      <dd className="mt-1 text-sm font-semibold">
        {new Intl.DateTimeFormat('es-BO', {
          timeZone: 'America/La_Paz',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        }).format(new Date(appointment.startsAt))}
      </dd>
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
