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
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { buttonStyles } from '../components/buttonStyles'
import { cn } from '../styles/cn'

const fieldClassName =
  'min-h-12 w-full rounded-xl border border-lou-steel/60 bg-white px-4 text-base shadow-sm outline-none transition-[border-color,box-shadow] focus:border-lou-ink focus:ring-3 focus:ring-lou-ink/10'
const labelClassName = 'grid gap-2 text-sm font-bold'

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
  const [confirmingCancel, setConfirmingCancel] = useState(false)
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
    if (!appointment.data || connectivity !== 'online') return
    setBusy(true)
    setNotice('')
    try {
      const cancelled = await publicBookingApi.cancel(token, appointment.data)
      client.setQueryData(['public-booking', 'manage', token], cancelled)
      window.history.replaceState(null, '', '/mi-cita')
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
    <main className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:py-20">
      <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
        Tu reserva
      </p>
      <h1 className="m-0 max-w-3xl font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
        Consulta o cambia tu cita.
      </h1>
      {appointment.isPending && <p role="status">Cargando tu reserva…</p>}
      {appointment.data && (
        <section className="mt-8 rounded-2xl border border-lou-fog bg-white p-5 shadow-lou-sm sm:p-8">
          <p className="inline-flex rounded-full bg-lou-ink px-3 py-1.5 text-xs font-bold text-white">
            {appointmentStatusLabel[appointment.data.status]}
          </p>
          <AppointmentSummary appointment={appointment.data} />
          {appointment.data.status === 'CONFIRMED' && !editing && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Button
                disabled={connectivity !== 'online' || busy}
                onClick={() => {
                  setEditing(true)
                  setServiceId(appointment.data.serviceId)
                  setBarberId(appointment.data.barberId)
                }}
              >
                Cambiar horario
              </Button>
              <Button
                variant="danger"
                disabled={connectivity !== 'online' || busy}
                onClick={() => setConfirmingCancel(true)}
              >
                Cancelar cita
              </Button>
            </div>
          )}
          {editing && (
            <div className="mt-7 border-t border-lou-fog pt-7">
              <h2 className="m-0 font-display text-4xl font-bold">Nuevo horario</h2>
              <form
                className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr_auto] lg:items-end"
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
                    {catalog.data?.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
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
                    <option value="any">Cualquiera</option>
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
                    min={todayInBusinessTime()}
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                </label>
                <Button variant="secondary">Buscar horarios</Button>
              </form>
              {slots.isFetching && <p role="status">Buscando horarios…</p>}
              {slots.data?.length === 0 && <p>No hay horarios ese día. Prueba otra fecha.</p>}
              <div
                className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
                role="group"
                aria-label="Nuevos horarios disponibles"
              >
                {slots.data?.map((item) => (
                  <button
                    className={cn(
                      'grid min-h-20 rounded-xl border border-lou-fog p-3 text-left transition-colors',
                      slot?.barberId === item.barberId &&
                        slot.startsAt === item.startsAt &&
                        'border-lou-ink bg-lou-ink text-white',
                    )}
                    type="button"
                    aria-pressed={
                      slot?.barberId === item.barberId && slot.startsAt === item.startsAt
                    }
                    key={`${item.barberId}-${item.startsAt}`}
                    onClick={() => setSlot(item)}
                  >
                    <strong className="font-display text-2xl">{agendaTime(item.startsAt)}</strong>
                    <span className="text-xs font-bold opacity-65">{item.barberName}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  disabled={!slot || connectivity !== 'online' || busy}
                  onClick={() => void reschedule()}
                >
                  {busy ? 'Guardando…' : 'Confirmar nuevo horario'}
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => setEditing(false)}>
                  Conservar cita actual
                </Button>
              </div>
            </div>
          )}
        </section>
      )}
      {connectivity === 'offline' && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="status">
          Sin conexión no podemos consultar ni cambiar el enlace privado.
        </p>
      )}
      {notice && (
        <p
          className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
          role="status"
        >
          {notice}
        </p>
      )}
      <p className="mt-8 text-center text-sm">
        <Link className="font-bold hover:underline" to="/reservar" viewTransition>
          Hacer otra reserva
        </Link>
      </p>
      {confirmingCancel && appointment.data && (
        <ConfirmDialog
          busy={busy}
          title={`¿Cancelar la cita de ${appointment.data.customerName}?`}
          confirmLabel="Sí, cancelar cita"
          onCancel={() => setConfirmingCancel(false)}
          onConfirm={() => {
            void cancel().finally(() => setConfirmingCancel(false))
          }}
        >
          El horario volverá a quedar disponible. Esta acción quedará registrada y no se puede
          deshacer desde el enlace público.
        </ConfirmDialog>
      )}
    </main>
  )
}

const InvalidLink = ({ message }: { message?: string }) => (
  <main className="mx-auto grid min-h-[60vh] w-full max-w-3xl content-center px-4 py-12 sm:px-6">
    <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-danger uppercase">
      Enlace privado
    </p>
    <h1 className="m-0 max-w-none font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
      No pudimos abrir esa cita.
    </h1>
    <p className="mt-5 max-w-xl leading-7 text-lou-graphite/65" role="alert">
      {message || 'El enlace no es válido, ya venció o la cita dejó de estar disponible.'}
    </p>
    <Link className={cn(buttonStyles(), 'mt-7 w-fit')} to="/reservar" viewTransition>
      Reservar una nueva cita
    </Link>
  </main>
)
