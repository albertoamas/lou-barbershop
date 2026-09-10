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
      <main className="public-page public-confirmation">
        <p className="eyebrow">Reserva confirmada</p>
        <h1>Te esperamos, {appointment.customerName}.</h1>
        <AppointmentSummary appointment={appointment} />
        <div className="management-link-card">
          <strong>Guarda tu enlace privado</strong>
          <p>Lo necesitarás para consultar, cambiar o cancelar esta cita. No lo compartas.</p>
          <Link className="primary-button button-link" to={confirmation.managementPath}>
            Administrar mi cita
          </Link>
        </div>
        <Link to="/book">Reservar otra cita</Link>
      </main>
    )
  }

  return (
    <main className="public-page">
      <header className="public-hero">
        <p className="eyebrow">Reserva en línea</p>
        <h1>Reserva tu cita.</h1>
        <p>
          Tu próximo corte, sin vueltas. Elige servicio, barbero y horario; no necesitas crear una
          cuenta.
        </p>
      </header>
      <ol className="booking-progress" aria-label="Progreso de reserva">
        <li className={slot ? 'complete' : 'current'}>1. Horario</li>
        <li className={slot ? 'current' : ''}>2. Tus datos</li>
        <li>3. Confirmación</li>
      </ol>
      <section className="public-card" aria-labelledby="choose-slot">
        <h2 id="choose-slot">Elige tu horario</h2>
        <form className="public-form public-filter" onSubmit={find}>
          <label>
            Servicio
            <select
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
          <label>
            Barbero
            <select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
              <option value="any">Cualquier barbero disponible</option>
              {catalog.data?.barbers.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.displayName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Día
            <input
              type="date"
              required
              min={todayInBusinessTime()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <button className="secondary-button" disabled={!serviceId || catalog.isPending}>
            Buscar horarios
          </button>
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
          <p className="empty-state">No hay horarios ese día. Prueba otra fecha o barbero.</p>
        )}
        {slots.data && slots.data.length > 0 && (
          <div className="public-slots" role="group" aria-label="Horarios disponibles">
            {slots.data.map((item) => (
              <button
                type="button"
                aria-pressed={slot?.barberId === item.barberId && slot.startsAt === item.startsAt}
                key={`${item.barberId}-${item.startsAt}`}
                onClick={() => setSlot(item)}
              >
                <strong>{agendaTime(item.startsAt)}</strong>
                <span>{item.barberName}</span>
                <small>
                  {item.durationMinutes} min · {centsToBolivianos(item.priceCents)}
                </small>
              </button>
            ))}
          </div>
        )}
        {connectivity === 'offline' && slots.data && (
          <p className="stale-note">
            Estos horarios estaban guardados y pueden estar desactualizados. Conéctate antes de
            confirmar.
          </p>
        )}
      </section>
      {slot && (
        <section className="public-card" aria-labelledby="customer-data">
          <h2 id="customer-data">Tus datos</h2>
          <p>
            {agendaTime(slot.startsAt)} con {slot.barberName} · {centsToBolivianos(slot.priceCents)}
          </p>
          <form className="public-form" onSubmit={confirm}>
            <label>
              Nombre
              <input
                autoComplete="name"
                minLength={2}
                maxLength={120}
                required
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label>
              WhatsApp o teléfono
              <input
                autoComplete="tel"
                inputMode="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="privacy-check">
              <input
                type="checkbox"
                required
                checked={privacyAccepted}
                onChange={(event) => setPrivacyAccepted(event.target.checked)}
              />
              <span>Autorizo usar mi nombre y teléfono únicamente para gestionar esta cita.</span>
            </label>
            <button
              className="primary-button"
              disabled={busy || connectivity !== 'online' || !privacyAccepted}
            >
              {busy
                ? 'Confirmando…'
                : connectivity === 'offline'
                  ? 'Conéctate para confirmar'
                  : 'Confirmar reserva'}
            </button>
          </form>
          {notice && (
            <p className="form-error" role="alert">
              {notice}
            </p>
          )}
        </section>
      )}
      <p className="public-access">
        Para cambiar una cita, abre el enlace privado que recibiste. ·{' '}
        <Link to="/login">Acceso del equipo</Link>
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
  <dl className="appointment-summary">
    <div>
      <dt>Servicio</dt>
      <dd>{appointment.serviceName}</dd>
    </div>
    <div>
      <dt>Barbero</dt>
      <dd>{appointment.barberName}</dd>
    </div>
    <div>
      <dt>Fecha y hora</dt>
      <dd>
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
    <div>
      <dt>Duración y precio</dt>
      <dd>
        {appointment.durationMinutes} min · {centsToBolivianos(appointment.priceCents)}
      </dd>
    </div>
  </dl>
)
