import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  agendaTime,
  appointmentsForDate,
  overlapsAnotherAppointment,
  sortAppointments,
  statusLabels,
  type Appointment,
  type AppointmentStatus,
} from '../../core/agenda/Agenda'
import { addCalendarDays, todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { AppointmentDetails } from '../components/AppointmentDetails'
import { AppointmentEditor } from '../components/AppointmentEditor'
import { Button } from '../components/Button'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { fieldClassName } from '../styles/formStyles'

const statusClassName: Record<AppointmentStatus, string> = {
  CONFIRMED: 'border-lou-steel bg-white before:bg-lou-graphite',
  CHECKED_IN: 'border-amber-300 bg-amber-50 before:bg-amber-600',
  IN_SERVICE: 'border-sky-300 bg-sky-50 before:bg-sky-700',
  COMPLETED: 'border-emerald-300 bg-emerald-50 before:bg-emerald-700',
  CANCELLED: 'border-red-200 bg-red-50/70 text-lou-graphite/55 before:bg-red-500',
  NO_SHOW: 'border-lou-fog bg-black/3 text-lou-graphite/55 before:bg-lou-graphite/45',
}

const dateLabel = (date: string, long = false) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: long ? 'long' : 'short',
    day: 'numeric',
    month: long ? 'long' : 'short',
  }).format(new Date(`${date}T12:00:00Z`))

const AppointmentCard = ({
  appointment,
  allAppointments,
  onOpen,
}: {
  appointment: Appointment
  allAppointments: Appointment[]
  onOpen: () => void
}) => {
  const overlap = overlapsAnotherAppointment(appointment, allAppointments)
  return (
    <button
      className={cn(
        'relative grid w-full gap-1 overflow-hidden rounded-2xl border p-4 pl-5 text-left shadow-lou-sm transition-[translate,box-shadow,border-color] duration-300 ease-lou before:absolute before:inset-y-0 before:left-0 before:w-1 hover:-translate-y-0.5 hover:border-lou-graphite/35 hover:shadow-lou-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lou-ink',
        statusClassName[appointment.status],
        overlap && 'border-dashed border-red-600',
      )}
      onClick={onOpen}
    >
      <span className="flex items-start justify-between gap-2">
        <strong className="font-display text-xl leading-none font-bold tabular-nums">
          {agendaTime(appointment.startsAt)}–{agendaTime(appointment.endsAt)}
        </strong>
        <small className="rounded-full bg-black/7 px-2 py-1 text-[0.65rem] leading-none font-bold whitespace-nowrap">
          {statusLabels[appointment.status]}
        </small>
      </span>
      <b className="mt-1 text-sm">{appointment.customerName}</b>
      <span className="text-xs text-lou-graphite/65">{appointment.serviceName}</span>
      <span className="text-xs text-lou-graphite/50">{appointment.barberName}</span>
      {overlap && <span className="mt-2 text-xs font-bold text-red-800">Horario superpuesto</span>}
    </button>
  )
}

export const AgendaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [date, setDate] = useState(todayInBusinessTime())
  const [weekly, setWeekly] = useState(false)
  const [barberId, setBarberId] = useState('')
  const [selected, setSelected] = useState<Appointment>()
  const [editor, setEditor] = useState<Appointment | null | undefined>(() =>
    (location.state as { newAppointment?: boolean } | null)?.newAppointment ? null : undefined,
  )
  const [notice, setNotice] = useState('')
  const client = useQueryClient()
  const disabled = useConnectivity() !== 'online'
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const barbers = useQuery({
    queryKey: ['scheduling', 'barbers'],
    queryFn: schedulingApi.listBarbers,
    enabled: canManage,
  })
  const dates = useMemo(
    () => Array.from({ length: weekly ? 7 : 1 }, (_, index) => addCalendarDays(date, index)),
    [date, weekly],
  )
  const agenda = useQuery({
    queryKey: ['agenda', date, weekly, canManage ? barberId : '', session.data?.id],
    queryFn: () => agendaApi.list(date, dates.at(-1) ?? date, canManage ? barberId : undefined),
    enabled: Boolean(session.data),
    refetchInterval: disabled ? false : 30_000,
  })
  const appointments = sortAppointments(agenda.data ?? [])
  const activeCount = appointments.filter(
    (item) => item.status !== 'CANCELLED' && item.status !== 'NO_SHOW',
  ).length
  const changed = () => {
    setSelected(undefined)
    setEditor(undefined)
    setNotice('Cambio guardado correctamente.')
    void client.invalidateQueries({ queryKey: ['agenda'] })
    void client.invalidateQueries({ queryKey: ['availability'] })
  }
  const openAppointment = (appointment: Appointment) => {
    setSelected(appointment)
    setEditor(undefined)
    setNotice('')
  }
  const moveDate = (direction: -1 | 1) =>
    setDate((current) => addCalendarDays(current, direction * (weekly ? 7 : 1)))

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 border-b border-lou-fog pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            {canManage ? 'Agenda del equipo' : 'Agenda personal'} · America/La_Paz
          </p>
          <h1 className="m-0 font-display text-5xl leading-[0.9] font-bold sm:text-6xl">
            {canManage ? 'Agenda' : 'Mi agenda'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
            Citas, llegadas y atención. Los cobros continúan separados.
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
            <AppIcon name="calendar" size={18} /> Nueva cita
          </Button>
        )}
      </header>

      {disabled && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Sin conexión: puedes consultar la vista guardada, pero no confirmar ni cambiar citas.
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
        className="sticky top-0 z-20 mt-5 rounded-2xl border border-lou-fog bg-white/95 p-3 shadow-lou-sm backdrop-blur-xl"
        aria-label="Controles de agenda"
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            aria-label={weekly ? 'Semana anterior' : 'Día anterior'}
            onClick={() => moveDate(-1)}
          >
            <AppIcon name="arrow-left" size={18} />
          </Button>
          <Button variant="ghost" onClick={() => setDate(todayInBusinessTime())}>
            Hoy
          </Button>
          <Button
            variant="ghost"
            aria-label={weekly ? 'Semana siguiente' : 'Día siguiente'}
            onClick={() => moveDate(1)}
          >
            <AppIcon name="arrow-right" size={18} />
          </Button>
          <div className="min-w-44 flex-1 px-2">
            <p className="font-display text-xl leading-none font-bold capitalize">
              {weekly
                ? `${dateLabel(date)} — ${dateLabel(dates.at(-1) ?? date)}`
                : dateLabel(date, true)}
            </p>
            <p className="mt-1 text-xs text-lou-graphite/50">
              {agenda.isPending
                ? 'Actualizando…'
                : `${activeCount} ${activeCount === 1 ? 'cita activa' : 'citas activas'}`}
            </p>
          </div>
          <div
            className="relative grid grid-cols-2 rounded-xl bg-lou-fog/60 p-1 text-sm font-bold"
            aria-label="Tipo de vista"
          >
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm transition-transform duration-300 ease-lou',
                weekly && 'translate-x-full',
              )}
            />
            <button
              className="relative z-10 px-4 py-2"
              aria-pressed={!weekly}
              onClick={() => setWeekly(false)}
            >
              Día
            </button>
            <button
              className="relative z-10 px-4 py-2"
              aria-pressed={weekly}
              onClick={() => setWeekly(true)}
            >
              7 días
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-3 border-t border-lou-fog pt-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-bold">
            Ir a una fecha
            <input
              className={fieldClassName}
              type="date"
              required
              value={date}
              onChange={(event) => event.target.value && setDate(event.target.value)}
            />
          </label>
          {canManage && (
            <label className="grid gap-1 text-xs font-bold">
              Barbero
              <select
                className={fieldClassName}
                value={barberId}
                onChange={(event) => setBarberId(event.target.value)}
              >
                <option value="">Todo el equipo</option>
                {barbers.data?.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.displayName}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2 text-xs" aria-label="Estados de las citas">
        {(['CONFIRMED', 'CHECKED_IN', 'IN_SERVICE', 'COMPLETED'] as AppointmentStatus[]).map(
          (status) => (
            <span
              key={status}
              className={cn(
                'rounded-full border px-3 py-1.5 font-semibold',
                statusClassName[status],
              )}
            >
              {statusLabels[status]}
            </span>
          ),
        )}
      </div>

      {agenda.isPending && (
        <p className="mt-8" role="status">
          Cargando citas…
        </p>
      )}
      {agenda.isError && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-5" role="alert">
          <p>No se pudo cargar la agenda.</p>
          <Button className="mt-3" variant="secondary" onClick={() => void agenda.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {agenda.data && weekly && (
        <div className="mt-6 grid gap-4 lg:grid-cols-7 lg:gap-2" aria-label="Agenda semanal">
          {dates.map((day) => {
            const rows = appointmentsForDate(appointments, day)
            return (
              <section key={day} className="min-w-0" aria-label={`Citas del ${day}`}>
                <h2 className="mb-3 border-b border-lou-fog pb-2 font-display text-2xl font-bold capitalize">
                  {dateLabel(day)}
                </h2>
                <div className="grid gap-3">
                  {rows.map((appointment) => (
                    <AppointmentCard
                      key={appointment.id}
                      appointment={appointment}
                      allAppointments={appointments}
                      onOpen={() => openAppointment(appointment)}
                    />
                  ))}
                  {rows.length === 0 && (
                    <p className="rounded-xl border border-dashed border-lou-steel/70 p-5 text-center text-xs text-lou-graphite/50">
                      Sin citas
                    </p>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {agenda.data && !weekly && (
        <section className="mt-6" aria-label="Agenda diaria">
          {canManage && !barberId && (barbers.data?.length ?? 0) > 1 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {barbers.data?.map((barber) => {
                const rows = appointmentsForDate(appointments, date).filter(
                  (item) => item.barberId === barber.id,
                )
                return (
                  <section
                    key={barber.id}
                    className="rounded-2xl border border-lou-fog bg-lou-paper/50 p-3"
                    aria-label={`Agenda de ${barber.displayName}`}
                  >
                    <h2 className="mb-3 px-1 font-display text-2xl font-bold">
                      {barber.displayName}
                    </h2>
                    <div className="grid gap-3">
                      {rows.map((appointment) => (
                        <AppointmentCard
                          key={appointment.id}
                          appointment={appointment}
                          allAppointments={appointments}
                          onOpen={() => openAppointment(appointment)}
                        />
                      ))}
                      {rows.length === 0 && (
                        <p className="rounded-xl border border-dashed border-lou-steel/70 p-5 text-center text-xs text-lou-graphite/50">
                          Horario disponible · sin citas
                        </p>
                      )}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="mx-auto grid max-w-3xl gap-3">
              {appointmentsForDate(appointments, date).map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  allAppointments={appointments}
                  onOpen={() => openAppointment(appointment)}
                />
              ))}
              {appointmentsForDate(appointments, date).length === 0 && (
                <p className="rounded-2xl border border-dashed border-lou-steel/70 p-10 text-center text-sm text-lou-graphite/55">
                  No hay citas para este día. El horario está disponible.
                </p>
              )}
            </div>
          )}
        </section>
      )}

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
            onOperationOpened={(opened) => navigate('/app/atenciones', { state: { opened } })}
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
