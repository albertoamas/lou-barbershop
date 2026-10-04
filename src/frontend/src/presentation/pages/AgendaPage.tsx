import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { Toast } from '../components/Toast'
import {
  AgendaTimeline,
  BarberColumnHeader,
  DayColumnHeader,
  type AgendaColumn,
} from '../components/agenda/AgendaTimeline'
import { AgendaWeek } from '../components/agenda/AgendaWeek'
import { DateField } from '../components/agenda/DateField'
import { useConnectivity } from '../hooks/useConnectivity'
import { tabletQuery, useMediaQuery, wideQuery } from '../hooks/useMediaQuery'
import { useMinuteClock } from '../hooks/useMinuteClock'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

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

const weekdayName = (date: string) =>
  new Intl.DateTimeFormat('es-BO', { timeZone: 'America/La_Paz', weekday: 'short' }).format(
    new Date(`${date}T12:00:00Z`),
  )

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold transition-colors duration-150',
    active
      ? 'border-ink bg-ink text-on-ink'
      : 'border-transparent bg-surface text-ink shadow-raised hover:border-line-control',
  )

const segmentClassName = (active: boolean) =>
  cn(
    'min-h-11 rounded-lg px-3 text-sm font-semibold sm:px-4 transition-colors duration-150',
    active ? 'bg-surface text-ink shadow-raised' : 'text-ink-soft hover:text-ink',
  )

interface EditorDraft {
  date: string
  barberId?: string | undefined
  time: string
}

export const AgendaPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [barberId, setBarberId] = useState('')
  const [phoneBarberId, setPhoneBarberId] = useState('')
  const [selected, setSelected] = useState<Appointment>()
  const [editor, setEditor] = useState<Appointment | null | undefined>(() =>
    (location.state as { newAppointment?: boolean } | null)?.newAppointment ? null : undefined,
  )
  // Barber, date and time picked by tapping an empty half hour for a new appointment.
  const [draft, setDraft] = useState<EditorDraft>()
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])
  const client = useQueryClient()
  const disabled = useConnectivity() !== 'online'
  const isTablet = useMediaQuery(tabletQuery)
  const isWide = useMediaQuery(wideQuery)
  const now = useMinuteClock()
  const today = todayInBusinessTime(now)
  const panel = useRef<HTMLElement>(null)
  const opener = useRef<HTMLElement | null>(null)

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
    // Keep showing the previous day while the next one loads instead of flashing a skeleton.
    placeholderData: keepPreviousData,
  })

  const appointments = sortAppointments(agenda.data ?? [])
  const dayAppointments = appointmentsForDate(appointments, date)
  const summary = summarizeDay(weekly ? appointments : dayAppointments)
  const team = barbers.data ?? []
  const showTeamChips = canManage && team.length > 1
  // One barber at a time on phones, and in the week grid everywhere: seven day columns
  // only stay readable for a single calendar. The chips choose which barber.
  const singleBarber = showTeamChips && (!isTablet || weekly)
  const focusedBarber = (isTablet ? barberId : phoneBarberId) || team[0]?.id || ''
  const focusedBarberName = team.find((barber) => barber.id === focusedBarber)?.displayName
  const weekAppointments = singleBarber
    ? appointments.filter((item) => item.barberId === focusedBarber)
    : appointments
  // The detail follows the latest data: the agenda refreshes every 30 seconds.
  const current = selected && (appointments.find((item) => item.id === selected.id) ?? selected)

  const nowMinutes = minutesOfDay(now.toISOString())
  // Tapping an empty half hour books it, as in a calendar app, from now on.
  const creation = (day: string, barber?: { id: string; name: string }) =>
    canManage && !disabled && day >= today
      ? {
          fromMinutes: day === today ? nowMinutes : 0,
          label: (time: string) =>
            `Nueva cita${barber ? ` con ${barber.name}` : ''}, ${longDate(day)} a las ${time}`,
          onSelect: (time: string) => openEditor({ date: day, barberId: barber?.id, time }),
        }
      : undefined

  const columns: AgendaColumn[] = canManage
    ? team
        .filter((barber) =>
          singleBarber ? barber.id === focusedBarber : !barberId || barber.id === barberId,
        )
        .map((barber) => {
          const own = dayAppointments.filter((item) => item.barberId === barber.id)
          return {
            id: barber.id,
            label: `Agenda de ${barber.displayName}`,
            header: <BarberColumnHeader name={barber.displayName} count={own.length} />,
            appointments: own,
            isToday: date === today,
            create: creation(date, { id: barber.id, name: barber.displayName }),
          }
        })
    : [
        {
          id: 'own',
          label: 'Mi agenda del día',
          header: (
            <BarberColumnHeader
              name={dayAppointments[0]?.barberName ?? session.data?.userName ?? 'Mi agenda'}
              count={dayAppointments.length}
            />
          ),
          appointments: dayAppointments,
          isToday: date === today,
        },
      ]

  const weekBarber =
    canManage && focusedBarberName ? { id: focusedBarber, name: focusedBarberName } : undefined
  const weekColumns: AgendaColumn[] = dates.map((day) => ({
    id: day,
    label: `Agenda del ${longDate(day)}`,
    header: (
      <DayColumnHeader
        weekday={weekdayName(day)}
        day={Number(day.slice(8))}
        isToday={day === today}
      />
    ),
    appointments: appointmentsForDate(weekAppointments, day),
    isToday: day === today,
    create: creation(day, weekBarber),
  }))

  const nowMarker =
    dates.includes(today) && nowOffset(now) !== undefined
      ? { offset: nowOffset(now) ?? 0, label: formatMinutes(nowMinutes) }
      : undefined

  // The inline panel is not modal: move focus into it when it opens and back on close.
  const currentId = current?.id
  useEffect(() => {
    if (isWide && currentId) panel.current?.focus()
  }, [isWide, currentId])

  const closeDetails = useCallback(() => {
    setSelected(undefined)
    opener.current?.focus()
  }, [])

  // Escape closes the inline panel while focus is inside it, as in a dialog.
  useEffect(() => {
    if (!isWide || !currentId) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panel.current?.contains(document.activeElement)) closeDetails()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isWide, currentId, closeDetails])
  const changed = () => {
    setSelected(undefined)
    setEditor(undefined)
    setNotice('Cambio guardado')
    void client.invalidateQueries({ queryKey: ['agenda'] })
    void client.invalidateQueries({ queryKey: ['availability'] })
  }
  const openAppointment = (appointment: Appointment) => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setSelected(appointment)
    setEditor(undefined)
  }
  function openEditor(start?: EditorDraft) {
    setDraft(start)
    setEditor(null)
    setSelected(undefined)
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

  const details = current && (
    <AppointmentDetails
      key={`${current.id}-${current.version}`}
      appointment={current}
      canManage={canManage}
      disabled={disabled}
      onChanged={changed}
      onClose={closeDetails}
      onOperationOpened={(opened) => navigate('/app/atenciones', { state: { opened } })}
      onReschedule={() => {
        setEditor(current)
        setSelected(undefined)
      }}
    />
  )

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="grid gap-4 lg:flex lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            {canManage ? 'Agenda' : 'Mi agenda'}
          </h1>
          <p className="mt-2 text-lg text-pretty text-ink-soft first-letter:uppercase">
            {weekly
              ? `Semana del ${shortDate(date)} al ${shortDate(dates.at(-1) ?? date)}`
              : longDate(date)}
            . {agenda.data ? `${summaryText}.` : ''}
          </p>
        </div>
        {/* On the narrowest phones the button drops to its own full-width row instead of
            wrapping its label. */}
        <div className="flex shrink-0 flex-wrap gap-2">
          <div
            className="grid flex-1 grid-cols-2 rounded-control bg-surface-strong p-1 sm:flex-none"
            role="group"
            aria-label="Vista"
          >
            <button
              type="button"
              className={segmentClassName(!weekly)}
              aria-pressed={!weekly}
              onClick={() => setWeekly(false)}
            >
              Día
            </button>
            <button
              type="button"
              className={segmentClassName(weekly)}
              aria-pressed={weekly}
              onClick={() => setWeekly(true)}
            >
              Semana
            </button>
          </div>
          {canManage && (
            <Button
              className="flex-1 whitespace-nowrap sm:flex-none"
              disabled={disabled}
              onClick={() => openEditor()}
            >
              <AppIcon name="calendar" size={20} />
              Nueva cita
            </Button>
          )}
        </div>
      </header>

      <section
        className="sticky top-[env(safe-area-inset-top)] z-20 -mx-4 mt-5 grid grid-cols-[minmax(0,1fr)] gap-3 bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        aria-label="Controles de agenda"
      >
        {/* Same order as the calendar the shop already uses: today, back, forward, date. */}
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className={cn('shrink-0', date === today && 'border-ink')}
            aria-current={date === today ? 'date' : undefined}
            onClick={() => setDate(today)}
          >
            Hoy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-11 shrink-0 px-0"
            aria-label={weekly ? 'Semana anterior' : 'Día anterior'}
            onClick={() => moveDate(-1)}
          >
            <AppIcon name="arrow-left" size={18} />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-11 shrink-0 px-0"
            aria-label={weekly ? 'Semana siguiente' : 'Día siguiente'}
            onClick={() => moveDate(1)}
          >
            <AppIcon name="arrow-right" size={18} />
          </Button>
          <DateField id="fecha" label="Ir a una fecha" value={date} onChange={setDate} />
          {agenda.isFetching && agenda.isPlaceholderData && (
            <span className="ml-auto hidden text-sm text-ink-muted sm:block" role="status">
              Actualizando...
            </span>
          )}
        </div>

        {showTeamChips && (
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            role="group"
            aria-label="Barbero"
          >
            {!singleBarber && (
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
              const active = singleBarber ? focusedBarber === barber.id : barberId === barber.id
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
      </section>

      {disabled && (
        <p role="status" className={cn(warningClassName, 'mt-4')}>
          Sin conexión. Puedes consultar la agenda guardada, pero no registrar llegadas ni cambiar
          citas.
        </p>
      )}

      {agenda.isPending && (
        <div className="mt-4 grid gap-3" role="status" aria-label="Cargando citas">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-panel bg-surface-strong" />
          ))}
        </div>
      )}
      {agenda.isError && !agenda.data && (
        <div
          className={cn(errorClassName, 'mt-4 flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          No se pudo cargar la agenda. Revisa la conexión y vuelve a intentarlo.
          <Button variant="secondary" size="sm" onClick={() => void agenda.refetch()}>
            Reintentar
          </Button>
        </div>
      )}

      {agenda.data && (
        <div
          className={cn(
            'mt-4 grid items-start gap-6',
            isWide && current && 'grid-cols-[minmax(0,1fr)_24rem]',
          )}
        >
          <div
            className={cn(
              'min-w-0 transition-opacity duration-150',
              agenda.isPlaceholderData && 'opacity-60',
            )}
            aria-busy={agenda.isPlaceholderData}
          >
            {weekly && isTablet && (
              <AgendaTimeline
                columns={weekColumns}
                allAppointments={appointments}
                now={nowMarker}
                selectedId={current?.id}
                compact
                onOpen={openAppointment}
              />
            )}
            {/* Phones list the week day by day, like a calendar's schedule view. */}
            {weekly && !isTablet && (
              <AgendaWeek
                dates={dates}
                today={today}
                appointments={weekAppointments}
                selectedId={current?.id}
                showBarber={canManage && !singleBarber}
                onOpen={openAppointment}
              />
            )}
            {!weekly && (
              <section aria-label="Agenda diaria">
                {dayAppointments.length === 0 && (
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-panel bg-surface p-5 shadow-raised">
                    <p className="text-ink-soft">
                      No hay citas este día.
                      {columns.some((column) => column.create)
                        ? ' Toca un espacio libre del calendario para agendar.'
                        : ' El horario está libre.'}
                    </p>
                    {canManage && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={disabled}
                        onClick={() => openEditor()}
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
                  selectedId={current?.id}
                  onOpen={openAppointment}
                />
              </section>
            )}
          </div>
          {isWide && details && (
            <aside
              ref={panel}
              tabIndex={-1}
              aria-label="Detalle de cita"
              className="sticky top-[calc(env(safe-area-inset-top)+8.5rem)] max-h-[calc(100dvh-10rem)] overflow-y-auto overscroll-contain rounded-sheet bg-surface p-6 shadow-floating"
            >
              {details}
            </aside>
          )}
        </div>
      )}

      {editor !== undefined && canManage && (
        <AgendaDialog
          label={editor ? 'Reprogramar cita' : 'Nueva cita'}
          onClose={() => setEditor(undefined)}
        >
          <AppointmentEditor
            key={
              editor?.id ?? `new-${draft?.date ?? ''}-${draft?.barberId ?? ''}-${draft?.time ?? ''}`
            }
            appointment={editor ?? undefined}
            date={editor ? todayInBusinessTime(new Date(editor.startsAt)) : (draft?.date ?? date)}
            barberId={editor ? undefined : draft?.barberId}
            startTime={editor ? undefined : draft?.time}
            disabled={disabled}
            onSaved={changed}
            onClose={() => setEditor(undefined)}
          />
        </AgendaDialog>
      )}
      {!isWide && details && (
        <AgendaDialog label="Detalle de cita" onClose={closeDetails}>
          {details}
        </AgendaDialog>
      )}
      <Toast message={notice} onDone={clearNotice} />
    </main>
  )
}
