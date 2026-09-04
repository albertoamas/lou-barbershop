import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { agendaTime, statusLabels, type Appointment } from '../../core/agenda/Agenda'
import { todayInBusinessTime, addCalendarDays } from '../../core/scheduling/Scheduling'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AppointmentEditor } from '../components/AppointmentEditor'
import { AppointmentDetails } from '../components/AppointmentDetails'
import { AgendaDialog } from '../components/AgendaDialog'
import { useConnectivity } from '../hooks/useConnectivity'

export const AgendaPage = () => {
  const [date, setDate] = useState(todayInBusinessTime())
  const [weekly, setWeekly] = useState(false)
  const [barberId, setBarberId] = useState('')
  const [selected, setSelected] = useState<Appointment>()
  const [editor, setEditor] = useState<Appointment | null | undefined>(undefined)
  const [notice, setNotice] = useState('')
  const client = useQueryClient()
  const connectivity = useConnectivity()
  const disabled = connectivity !== 'online'
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const barbers = useQuery({
    queryKey: ['scheduling', 'barbers'],
    queryFn: schedulingApi.listBarbers,
    enabled: canManage,
  })
  const dates = Array.from({ length: weekly ? 7 : 1 }, (_, i) => addCalendarDays(date, i))
  const agenda = useQuery({
    queryKey: ['agenda', date, weekly, canManage ? barberId : '', session.data?.id],
    queryFn: () => agendaApi.list(date, dates.at(-1) ?? date, canManage ? barberId : undefined),
    enabled: Boolean(session.data),
    refetchInterval: disabled ? false : 30_000,
  })
  const changed = () => {
    setSelected(undefined)
    setEditor(undefined)
    setNotice('Cambio guardado correctamente.')
    void client.invalidateQueries({ queryKey: ['agenda'] })
    void client.invalidateQueries({ queryKey: ['availability'] })
  }
  return (
    <main className="content scheduling-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Agenda interna · America/La_Paz</p>
          <h1>{canManage ? 'Cada cita, en su lugar.' : 'Mi día'}</h1>
          <p>Reservas y llegadas. Los cobros se registrarán en atención, por separado.</p>
        </div>
        {canManage && (
          <button
            className="primary-button"
            disabled={disabled}
            onClick={() => {
              setEditor(null)
              setSelected(undefined)
              setNotice('')
            }}
          >
            Nueva cita
          </button>
        )}
      </div>
      {disabled && (
        <p role="status" className="conflict-notice">
          Sin conexión: no se pueden confirmar ni cambiar citas. La vista puede estar
          desactualizada.
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <section className="agenda-toolbar" aria-label="Filtros de agenda">
        <label>
          Desde el día
          <input
            type="date"
            required
            value={date}
            onChange={(event) => {
              if (event.target.value) setDate(event.target.value)
            }}
          />
        </label>
        <label>
          Vista
          <select
            value={weekly ? 'week' : 'day'}
            onChange={(event) => setWeekly(event.target.value === 'week')}
          >
            <option value="day">Diaria</option>
            <option value="week">7 días</option>
          </select>
        </label>
        {canManage && (
          <label>
            Filtrar barbero
            <select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
              <option value="">Todos los barberos</option>
              {barbers.data?.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        <button
          onClick={() => {
            setDate(todayInBusinessTime())
            setWeekly(false)
          }}
        >
          Hoy
        </button>
        <button onClick={() => void agenda.refetch()}>Actualizar agenda</button>
      </section>
      {agenda.isPending && <p role="status">Cargando citas…</p>}
      {agenda.isError && (
        <p role="alert">No se pudo cargar la agenda. Usa Actualizar agenda para reintentar.</p>
      )}
      <div
        className={`internal-agenda${weekly ? ' weekly' : ''}`}
        aria-label={weekly ? 'Agenda semanal' : 'Agenda diaria'}
      >
        {agenda.data &&
          dates.map((day) => {
            const rows = agenda.data.filter(
              (item) => todayInBusinessTime(new Date(item.startsAt)) === day,
            )
            return (
              <section key={day} className="agenda-day" aria-label={`Citas del ${day}`}>
                <h2>
                  {new Intl.DateTimeFormat('es-BO', {
                    timeZone: 'America/La_Paz',
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  }).format(new Date(`${day}T12:00:00Z`))}
                </h2>
                {rows.length === 0 && <p className="empty-agenda">Sin citas registradas.</p>}
                {rows.map((appointment) => (
                  <button
                    key={appointment.id}
                    className={`appointment-card status-${appointment.status.toLowerCase()}`}
                    onClick={() => {
                      setSelected(appointment)
                      setEditor(undefined)
                    }}
                  >
                    <strong>
                      {agendaTime(appointment.startsAt)}–{agendaTime(appointment.endsAt)}
                    </strong>
                    <b>{appointment.customerName}</b>
                    <span>{appointment.serviceName}</span>
                    <span>{appointment.barberName}</span>
                    <small>{statusLabels[appointment.status]}</small>
                  </button>
                ))}
              </section>
            )
          })}
      </div>
      {editor !== undefined && canManage && (
        <AgendaDialog label={editor ? 'Reprogramar cita' : 'Nueva cita'}>
          <AppointmentEditor
            key={editor?.id ?? 'new'}
            appointment={editor ?? undefined}
            date={editor ? todayInBusinessTime(new Date(editor.startsAt)) : date}
            disabled={disabled}
            onSaved={changed}
            onClose={() => setEditor(undefined)}
          />
        </AgendaDialog>
      )}
      {selected && (
        <AgendaDialog label="Detalle de cita">
          <AppointmentDetails
            key={`${selected.id}-${selected.version}`}
            appointment={selected}
            canManage={canManage}
            disabled={disabled}
            onChanged={changed}
            onClose={() => setSelected(undefined)}
            onReschedule={() => {
              setEditor(selected)
              setSelected(undefined)
            }}
          />
        </AgendaDialog>
      )}
    </main>
  )
}
