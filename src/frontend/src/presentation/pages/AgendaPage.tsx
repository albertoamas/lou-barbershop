import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  agendaTime,
  statusLabels,
  type Appointment,
  type AppointmentStatus,
} from '../../core/agenda/Agenda'
import { todayInBusinessTime, addCalendarDays } from '../../core/scheduling/Scheduling'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AppointmentEditor } from '../components/AppointmentEditor'
import { AppointmentDetails } from '../components/AppointmentDetails'
import { AgendaDialog } from '../components/AgendaDialog'
import { useConnectivity } from '../hooks/useConnectivity'
import { Button } from '../components/Button'
import { cn } from '../styles/cn'
import { useNavigate } from 'react-router-dom'
import { fieldClassName } from '../styles/formStyles'
const statusClassName: Record<AppointmentStatus, string> = {
  CONFIRMED: 'border-lou-steel bg-white',
  CHECKED_IN: 'border-amber-500 bg-amber-50',
  IN_SERVICE: 'border-sky-600 bg-sky-50',
  COMPLETED: 'border-emerald-700 bg-emerald-50',
  CANCELLED: 'border-lou-danger/40 bg-red-50 opacity-70',
  NO_SHOW: 'border-lou-graphite/30 bg-black/5 opacity-70',
}

export const AgendaPage = () => {
  const navigate = useNavigate()
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
    <main className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="flex flex-col justify-between gap-6 border-b border-lou-fog pb-8 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Agenda interna · America/La_Paz
          </p>
          <h1 className="m-0 max-w-4xl font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
            {canManage ? 'Cada cita, en su lugar.' : 'Mi día'}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-lou-graphite/65">
            Reservas y llegadas. Los cobros se registran en atención, por separado.
          </p>
        </div>
        {canManage && (
          <Button
            disabled={disabled}
            onClick={() => {
              setEditor(null)
              setSelected(undefined)
              setNotice('')
            }}
          >
            Nueva cita
          </Button>
        )}
      </div>
      {disabled && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Sin conexión: no se pueden confirmar ni cambiar citas. La vista puede estar
          desactualizada.
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
      <section
        className="sticky top-0 z-20 mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-lou-fog bg-white/90 p-4 shadow-lou-sm backdrop-blur-xl"
        aria-label="Filtros de agenda"
      >
        <label className="grid min-w-40 flex-1 gap-1.5 text-xs font-bold">
          Desde el día
          <input
            className={fieldClassName}
            type="date"
            required
            value={date}
            onChange={(event) => {
              if (event.target.value) setDate(event.target.value)
            }}
          />
        </label>
        <label className="grid min-w-32 gap-1.5 text-xs font-bold">
          Vista
          <select
            className={fieldClassName}
            value={weekly ? 'week' : 'day'}
            onChange={(event) => setWeekly(event.target.value === 'week')}
          >
            <option value="day">Diaria</option>
            <option value="week">7 días</option>
          </select>
        </label>
        {canManage && (
          <label className="grid min-w-44 flex-1 gap-1.5 text-xs font-bold">
            Filtrar barbero
            <select
              className={fieldClassName}
              value={barberId}
              onChange={(event) => setBarberId(event.target.value)}
            >
              <option value="">Todos los barberos</option>
              {barbers.data?.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.displayName}
                </option>
              ))}
            </select>
          </label>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            setDate(todayInBusinessTime())
            setWeekly(false)
          }}
        >
          Hoy
        </Button>
        <Button variant="secondary" onClick={() => void agenda.refetch()}>
          Actualizar
        </Button>
      </section>
      {agenda.isPending && <p role="status">Cargando citas…</p>}
      {agenda.isError && (
        <p role="alert">No se pudo cargar la agenda. Usa Actualizar agenda para reintentar.</p>
      )}
      <div
        className={cn('mt-6 grid gap-4', weekly && 'lg:grid-cols-7 lg:gap-2')}
        aria-label={weekly ? 'Agenda semanal' : 'Agenda diaria'}
      >
        {agenda.data &&
          dates.map((day) => {
            const rows = agenda.data.filter(
              (item) => todayInBusinessTime(new Date(item.startsAt)) === day,
            )
            return (
              <section key={day} className="min-w-0" aria-label={`Citas del ${day}`}>
                <h2 className="sticky top-28 z-10 mb-3 rounded-lg bg-lou-paper/95 py-2 font-display text-2xl font-bold capitalize backdrop-blur-sm">
                  {new Intl.DateTimeFormat('es-BO', {
                    timeZone: 'America/La_Paz',
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  }).format(new Date(`${day}T12:00:00Z`))}
                </h2>
                {rows.length === 0 && (
                  <p className="rounded-xl border border-dashed border-lou-steel/70 p-5 text-center text-xs text-lou-graphite/50">
                    Sin citas registradas.
                  </p>
                )}
                {rows.map((appointment) => (
                  <button
                    key={appointment.id}
                    className={cn(
                      'mb-3 grid w-full gap-1 rounded-xl border-l-4 p-4 text-left shadow-lou-sm transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-lou-lg',
                      statusClassName[appointment.status],
                    )}
                    onClick={() => {
                      setSelected(appointment)
                      setEditor(undefined)
                    }}
                  >
                    <strong className="font-display text-xl tabular-nums">
                      {agendaTime(appointment.startsAt)}–{agendaTime(appointment.endsAt)}
                    </strong>
                    <b className="text-sm">{appointment.customerName}</b>
                    <span className="text-xs text-lou-graphite/65">{appointment.serviceName}</span>
                    <span className="text-xs text-lou-graphite/50">{appointment.barberName}</span>
                    <small className="mt-2 w-fit rounded-full bg-black/7 px-2 py-1 text-[0.65rem] font-bold">
                      {statusLabels[appointment.status]}
                    </small>
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
            onOperationOpened={(opened) =>
              navigate('/app/atenciones', { state: { opened }, viewTransition: true })
            }
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
