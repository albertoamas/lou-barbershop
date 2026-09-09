import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import {
  appointmentStatusLabel,
  managementTokenFromHash,
  type PublicBookingConfirmation,
} from '../../core/public-booking/PublicBooking'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { ApiError } from '../../infrastructure/http/apiClient'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { useConnectivity } from '../hooks/useConnectivity'
import { AppointmentSummary } from './PublicBookingPage'

export const PublicManageBookingPage = () => {
  const initialToken = managementTokenFromHash(window.location.hash)
  const [token, setToken] = useState(initialToken)
  const [editing, setEditing] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [barberId, setBarberId] = useState('any')
  const [date, setDate] = useState(todayInBusinessTime())
  const [search, setSearch] = useState<{ serviceId: string; barberId: string; date: string }>()
  const [slot, setSlot] = useState<AvailabilitySlot>()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const connectivity = useConnectivity()
  const client = useQueryClient()
  const appointment = useQuery({
    queryKey: ['public-booking', 'manage', token],
    queryFn: () => publicBookingApi.read(token),
    enabled: Boolean(token),
    retry: false,
    networkMode: 'always',
  })
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    enabled: editing,
    networkMode: 'always',
  })
  const slots = useQuery({
    queryKey: ['public-booking', 'manage-availability', search],
    queryFn: () =>
      search
        ? publicBookingApi.availability(search.serviceId, search.barberId, search.date)
        : Promise.resolve([]),
    enabled: Boolean(search),
    retry: false,
    networkMode: 'always',
  })
  const find = (event: FormEvent) => {
    event.preventDefault()
    setSlot(undefined)
    setSearch({ serviceId, barberId, date })
  }
  const reschedule = async () => {
    if (!appointment.data || !slot || connectivity !== 'online') return
    setBusy(true)
    setNotice('')
    try {
      const changed: PublicBookingConfirmation = await publicBookingApi.reschedule(
        token,
        appointment.data,
        slot,
      )
      setToken(changed.managementToken)
      window.history.replaceState(null, '', changed.managementPath)
      client.setQueryData(
        ['public-booking', 'manage', changed.managementToken],
        changed.appointment,
      )
      setEditing(false)
      setSlot(undefined)
      setSearch(undefined)
      setNotice('Cita reprogramada. Tu enlace privado fue renovado; guarda esta página.')
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? error.message)
          : 'No pudimos cambiar la cita.',
      )
      setSlot(undefined)
      await slots.refetch()
    } finally {
      setBusy(false)
    }
  }
  const cancel = async () => {
    if (
      !appointment.data ||
      connectivity !== 'online' ||
      !window.confirm(`¿Cancelar la cita de ${appointment.data.customerName}?`)
    )
      return
    setBusy(true)
    setNotice('')
    try {
      const cancelled = await publicBookingApi.cancel(token, appointment.data)
      client.setQueryData(['public-booking', 'manage', token], cancelled)
      window.history.replaceState(null, '', '/book/manage')
      setNotice('La cita fue cancelada. Ese horario volvió a quedar disponible.')
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? error.message)
          : 'No pudimos cancelar la cita.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (!initialToken && !appointment.data) return <InvalidLink message={notice} />
  if (appointment.isError) return <InvalidLink />
  return (
    <main className="public-page">
      <p className="eyebrow">Tu reserva</p>
      <h1>Consulta o cambia tu cita.</h1>
      {appointment.isPending && <p role="status">Cargando tu reserva…</p>}
      {appointment.data && (
        <section className="public-card manage-card">
          <p className={`status-chip status-${appointment.data.status.toLowerCase()}`}>
            {appointmentStatusLabel[appointment.data.status]}
          </p>
          <AppointmentSummary appointment={appointment.data} />
          {appointment.data.status === 'CONFIRMED' && !editing && (
            <div className="manage-actions">
              <button
                className="primary-button"
                disabled={connectivity !== 'online' || busy}
                onClick={() => {
                  setEditing(true)
                  setServiceId(appointment.data.serviceId)
                  setBarberId(appointment.data.barberId)
                }}
              >
                Cambiar horario
              </button>
              <button
                className="danger-button"
                disabled={connectivity !== 'online' || busy}
                onClick={() => void cancel()}
              >
                Cancelar cita
              </button>
            </div>
          )}
          {editing && (
            <div className="manage-editor">
              <h2>Nuevo horario</h2>
              <form className="public-form public-filter" onSubmit={find}>
                <label>
                  Servicio
                  <select
                    required
                    value={serviceId}
                    onChange={(event) => setServiceId(event.target.value)}
                  >
                    {catalog.data?.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Barbero
                  <select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
                    <option value="any">Cualquiera</option>
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
                    min={todayInBusinessTime()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
                <button className="secondary-button">Buscar horarios</button>
              </form>
              {slots.isFetching && <p role="status">Buscando horarios…</p>}
              {slots.data?.length === 0 && <p>No hay horarios ese día. Prueba otra fecha.</p>}
              <div className="public-slots" role="group" aria-label="Nuevos horarios disponibles">
                {slots.data?.map((item) => (
                  <button
                    type="button"
                    aria-pressed={
                      slot?.barberId === item.barberId && slot.startsAt === item.startsAt
                    }
                    key={`${item.barberId}-${item.startsAt}`}
                    onClick={() => setSlot(item)}
                  >
                    <strong>{agendaTime(item.startsAt)}</strong>
                    <span>{item.barberName}</span>
                  </button>
                ))}
              </div>
              <div className="manage-actions">
                <button
                  className="primary-button"
                  disabled={!slot || connectivity !== 'online' || busy}
                  onClick={() => void reschedule()}
                >
                  {busy ? 'Guardando…' : 'Confirmar nuevo horario'}
                </button>
                <button
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  Conservar cita actual
                </button>
              </div>
            </div>
          )}
        </section>
      )}
      {connectivity === 'offline' && (
        <p className="stale-note" role="status">
          Sin conexión no podemos consultar ni cambiar el enlace privado.
        </p>
      )}
      {notice && (
        <p className="form-success" role="status">
          {notice}
        </p>
      )}
      <p className="public-access">
        <Link to="/book">Hacer otra reserva</Link>
      </p>
    </main>
  )
}

const InvalidLink = ({ message }: { message?: string }) => (
  <main className="public-page public-confirmation">
    <p className="eyebrow">Enlace privado</p>
    <h1>No pudimos abrir esa cita.</h1>
    <p role="alert">
      {message || 'El enlace no es válido, ya venció o la cita dejó de estar disponible.'}
    </p>
    <Link className="primary-button button-link" to="/book">
      Reservar una nueva cita
    </Link>
  </main>
)
