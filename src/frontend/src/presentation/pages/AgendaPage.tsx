import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { appointmentsForDate, sortAppointments, type Appointment } from '../../core/agenda/Agenda'
import {
  formatMinutes,
  minutesOfDay,
  nowOffset,
  summarizeDay,
} from '../../core/agenda/AgendaTimeline'
import { addCalendarDays, todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { AppointmentDetails } from '../components/AppointmentDetails'
import { AppointmentEditor } from '../components/AppointmentEditor'
import { Button } from '../components/Button'
import { AgendaTimeline, type AgendaColumn } from '../components/agenda/AgendaTimeline'
import { AgendaWeek } from '../components/agenda/AgendaWeek'
import { useConnectivity } from '../hooks/useConnectivity'
import { tabletQuery, useMediaQuery, wideQuery } from '../hooks/useMediaQuery'
import { cn } from '../styles/cn'
import {
  errorClassName,
  fieldClassName,
  successClassName,
  warningClassName,
} from '../styles/formStyles'

const longDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${date}T12:00:00Z`))

const shortDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00Z`))

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

// Re-renders once a minute so the current time line keeps moving.
const useMinuteClock = () => {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold transition-colors duration-150',
    active
      ? 'border-ink bg-ink text-on-ink'
      : 'border-transparent bg-surface text-ink hover:border-line-control',
  )

export const AgendaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [barberId, setBarberId] = useState('')
  const [phoneBarberId, setPhoneBarberId] = useState('')
  const [selected, setSelected] = useState<Appointment>()
  const [editor, setEditor] = useState<Appointment | null | undefined>(() =>
    (location.state as { newAppointment?: boolean } | null)?.newAppointment ? null : undefined,
  )
  const [notice, setNotice] = useState('')
  const client = useQueryClient()
  const disabled = useConnectivity() !== 'online'
  const isTablet = useMediaQuery(tabletQuery)
  const isWide = useMediaQuery(wideQuery)
  const now = useMinuteClock()
  const today = todayInBusinessTime(now)

  // Date and view live in the URL so a reload or a shared link keeps the same agenda.
  const [params, setParams] = useSearchParams()
  const requestedDate = params.get('fecha')
  const date = requestedDate && isoDatePattern.test(requestedDate) ? requestedDate : today
  const weekly = params.get('vista') === 'semana'
  const updateParams = (change: (next: URLSearchParams) => void) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        change(next)
        return next
      },
      { replace: true },
    )
  const setDate = (next: string) => updateParams((query) => query.set('fecha', next))
  const setWeekly = (next: boolean) =>
    updateParams((query) => (next ? query.set('vista', 'semana') : query.delete('vista')))

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
  const dayAppointments = appointmentsForDate(appointments, date)
  const summary = summarizeDay(weekly ? appointments : dayAppointments)
  const team = barbers.data ?? []
  const showTeamChips = canManage && team.length > 1
  const focusedPhoneBarber = phoneBarberId || team[0]?.id || ''

  const columns: AgendaColumn[] = canManage
    ? team
        .filter((barber) =>
          isTablet ? !barberId || barber.id === barberId : barber.id === focusedPhoneBarber,
        )
        .map((barber) => ({
          id: barber.id,
          name: barber.displayName,
          appointments: dayAppointments.filter((item) => item.barberId === barber.id),
        }))
    : [
        {
          id: 'own',
          name: dayAppointments[0]?.barberName ?? session.data?.userName ?? 'Mi agenda',
          appointments: dayAppointments,
        },
      ]

  const nowMarker =
    !weekly && date === today && nowOffset(now) !== undefined
      ? {
          offset: nowOffset(now) ?? 0,
          label: formatMinutes(minutesOfDay(now.toISOString())),
        }
      : undefined

  const changed = () => {
    setSelected(undefined)
    setEditor(undefined)
    setNotice('Cambio guardado.')
    void client.invalidateQueries({ queryKey: ['agenda'] })
    void client.invalidateQueries({ queryKey: ['availability'] })
  }
  const openAppointment = (appointment: Appointment) => {
    setSelected(appointment)
    setEditor(undefined)
    setNotice('')
  }
  const moveDate = (direction: -1 | 1) =>
    setDate(addCalendarDays(date, direction * (weekly ? 7 : 1)))

  const summaryText = [
    plural(summary.active, 'cita', 'citas'),
    summary.waiting > 0 ? plural(summary.waiting, 'cliente esperando', 'clientes esperando') : '',
    summary.inService > 0 ? `${summary.inService} en atención` : '',
  ]
    .filter(Boolean)
    .join(', ')

  const details = selected && (
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
  )

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            {canManage ? 'Agenda' : 'Mi agenda'}
          </h1>
          <p className="mt-2 text-lg text-ink-soft first-letter:uppercase">
            {weekly
              ? `Semana del ${shortDate(date)} al ${shortDate(dates.at(-1) ?? date)}`
              : longDate(date)}
            . {agenda.data ? `${summaryText}.` : ''}
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
            <AppIcon name="calendar" size={20} />
            Nueva cita
          </Button>
        )}
      </header>

      <section
        className="sticky top-0 z-20 -mx-4 mt-5 flex flex-wrap items-center gap-2 bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        aria-label="Controles de agenda"
      >
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="w-11 px-0"
            aria-label={weekly ? 'Semana anterior' : 'Día anterior'}
            onClick={() => moveDate(-1)}
          >
            <AppIcon name="arrow-left" size={18} />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDate(today)}>
            Hoy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-11 px-0"
            aria-label={weekly ? 'Semana siguiente' : 'Día siguiente'}
            onClick={() => moveDate(1)}
          >
            <AppIcon name="arrow-right" size={18} />
          </Button>
        </div>
        <label className="sr-only" htmlFor="agenda-date">
          Ir a una fecha
        </label>
        <input
          id="agenda-date"
          name="fecha"
          autoComplete="off"
          className={cn(fieldClassName, 'min-h-11 w-auto')}
          type="date"
          required
          value={date}
          onChange={(event) => event.target.value && setDate(event.target.value)}
        />
        <div
          className="ml-auto grid grid-cols-2 rounded-control bg-surface-strong p-1"
          role="group"
          aria-label="Vista"
        >
          <button
            type="button"
            className={cn(
              'min-h-10 rounded-lg px-4 text-sm font-semibold',
              !weekly && 'bg-surface shadow-raised',
            )}
            aria-pressed={!weekly}
            onClick={() => setWeekly(false)}
          >
            Día
          </button>
          <button
            type="button"
            className={cn(
              'min-h-10 rounded-lg px-4 text-sm font-semibold',
              weekly && 'bg-surface shadow-raised',
            )}
            aria-pressed={weekly}
            onClick={() => setWeekly(true)}
          >
            Semana
          </button>
        </div>
      </section>

      {showTeamChips && (
        <div
          className="-mx-4 mt-1 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          role="group"
          aria-label="Barbero"
        >
          {isTablet && (
            <button
              type="button"
              className={chipClassName(!barberId)}
              aria-pressed={!barberId}
              onClick={() => setBarberId('')}
            >
              Todo el equipo
            </button>
          )}
          {team.map((barber) => {
            const active = isTablet ? barberId === barber.id : focusedPhoneBarber === barber.id
            const count = dayAppointments.filter((item) => item.barberId === barber.id).length
            return (
              <button
                key={barber.id}
                type="button"
                className={chipClassName(active)}
                aria-pressed={active}
                onClick={() => (isTablet ? setBarberId(barber.id) : setPhoneBarberId(barber.id))}
              >
                {barber.displayName}
                {!weekly && <span className="tabular-nums opacity-75">{count}</span>}
              </button>
            )
          })}
        </div>
      )}

      {disabled && (
        <p role="status" className={cn(warningClassName, 'mt-4')}>
          Sin conexión. Puedes consultar la agenda guardada, pero no registrar llegadas ni cambiar
          citas.
        </p>
      )}
      {notice && (
        <p role="status" className={cn(successClassName, 'mt-4')}>
          {notice}
        </p>
      )}

      {agenda.isPending && (
        <div className="mt-4 grid gap-3" role="status" aria-label="Cargando citas">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-panel bg-surface-strong" />
          ))}
        </div>
      )}
      {agenda.isError && (
        <div
          className={cn(errorClassName, 'mt-4 flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          No se pudo cargar la agenda.
          <Button variant="secondary" size="sm" onClick={() => void agenda.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {agenda.data && (
        <div
          className={cn(
            'mt-4 grid items-start gap-6',
            isWide && selected && 'grid-cols-[minmax(0,1fr)_24rem]',
          )}
        >
          <div className="min-w-0">
            {weekly ? (
              <AgendaWeek
                dates={dates}
                today={today}
                appointments={appointments}
                selectedId={selected?.id}
                showBarber={canManage && !barberId}
                onOpen={openAppointment}
              />
            ) : (
              <section aria-label="Agenda diaria">
                {dayAppointments.length === 0 && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-panel bg-surface p-5 shadow-raised">
                    <p className="text-ink-soft">No hay citas este día. El horario está libre.</p>
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => setEditor(null)}
                      >
                        Crear cita
                      </Button>
                    )}
                  </div>
                )}
                <AgendaTimeline
                  columns={columns}
                  allAppointments={appointments}
                  now={nowMarker}
                  selectedId={selected?.id}
                  onOpen={openAppointment}
                />
              </section>
            )}
          </div>
          {isWide && details && (
            <aside className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-sheet bg-surface p-6 shadow-floating">
              {details}
            </aside>
          )}
        </div>
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
      {!isWide && details && <AgendaDialog label="Detalle de cita">{details}</AgendaDialog>}
    </main>
  )
}
