import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  addCalendarDays,
  businessDateFromIso,
  businessLocalToIso,
  exceptionAppliesOn,
  scheduleAppliesOn,
  todayInBusinessTime,
  weekStartFor,
  weekdayLabels,
  type AppointmentConflict,
  type AvailabilityException,
  type ExceptionKind,
  type ScheduleUpdate,
  type WorkingSchedule,
} from '../../core/scheduling/Scheduling'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  panelClassName,
} from '../styles/formStyles'

type View = 'week' | 'search' | 'exceptions'
type Editor = { type: 'schedule'; value?: WorkingSchedule } | { type: 'exception' } | null

const views: { id: View; label: string }[] = [
  { id: 'week', label: 'Semana' },
  { id: 'search', label: 'Buscar espacios' },
  { id: 'exceptions', label: 'Excepciones' },
]
const localDate = (value: string) =>
  new Intl.DateTimeFormat('es-BO', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00-04:00`),
  )
const localTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
const localDateTime = (value: string) =>
  `${localDate(businessDateFromIso(value))}, ${localTime(value)}`
const messageFor = (error: unknown) =>
  error instanceof ApiError
    ? (error.problem.detail ?? error.problem.title)
    : 'No se pudo completar la acción. Intenta nuevamente.'
const exceptionLabel = (kind: ExceptionKind) =>
  kind === 'UNAVAILABLE' ? 'Ausencia o bloqueo' : 'Horario extraordinario'

export const SchedulingPage = () => {
  const today = todayInBusinessTime()
  const online = useConnectivity() === 'online'
  const queryClient = useQueryClient()
  const [view, setView] = useState<View>('week')
  const [barberSelection, setBarberSelection] = useState('')
  const [weekOffset, setWeekOffset] = useState(0)
  const [editor, setEditor] = useState<Editor>(null)
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([])
  const [busy, setBusy] = useState(false)

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const isBarber = session.data?.roles.includes('BARBER') ?? false
  const ownBarber = useQuery({
    queryKey: ['sales', 'own-barber'],
    queryFn: salesApi.ownBarber,
    enabled: !canManage && isBarber,
  })
  const barbers = useQuery({
    queryKey: ['scheduling', 'barbers'],
    queryFn: schedulingApi.listBarbers,
    enabled: Boolean(session.data),
  })
  const selectedBarberId = canManage
    ? barberSelection || barbers.data?.[0]?.id || ''
    : ownBarber.data?.barberId || ''
  const selectedBarber = barbers.data?.find((barber) => barber.id === selectedBarberId)
  const schedules = useQuery({
    queryKey: ['scheduling', 'schedules', selectedBarberId],
    queryFn: () => schedulingApi.listSchedules(selectedBarberId),
    enabled: Boolean(selectedBarberId),
  })
  const exceptions = useQuery({
    queryKey: ['scheduling', 'exceptions', selectedBarberId],
    queryFn: () => schedulingApi.listExceptions(selectedBarberId),
    enabled: Boolean(selectedBarberId),
  })
  const weekStart = addCalendarDays(weekStartFor(today), weekOffset * 7)
  const weekDates = Array.from({ length: 7 }, (_, index) => addCalendarDays(weekStart, index))
  const isUpcomingException = (item: AvailabilityException) =>
    item.active && new Date(item.endsAt).getTime() > new Date(`${today}T00:00:00-04:00`).getTime()
  const upcomingExceptions = (exceptions.data ?? []).filter(isUpcomingException)

  const execute = async (
    action: () => Promise<{ conflicts: AppointmentConflict[] }>,
    successMessage: string,
  ) => {
    if (!online || !canManage) return
    setBusy(true)
    setNotice('')
    setConflicts([])
    try {
      const result = await action()
      await queryClient.invalidateQueries({ queryKey: ['scheduling'] })
      await queryClient.invalidateQueries({ queryKey: ['availability'] })
      setConflicts(result.conflicts)
      setNotice(successMessage)
      setNoticeIsError(false)
      setEditor(null)
    } catch (error) {
      setNotice(messageFor(error))
      setNoticeIsError(true)
    } finally {
      setBusy(false)
    }
  }

  if (
    session.isPending ||
    (session.isSuccess && (barbers.isPending || (!canManage && isBarber && ownBarber.isPending)))
  ) {
    return (
      <main className="mx-auto max-w-360 px-4 py-8" role="status">
        Cargando disponibilidad…
      </main>
    )
  }
  if (session.isError || barbers.isError || (!canManage && ownBarber.isError)) {
    return (
      <main className="mx-auto max-w-360 px-4 py-8">
        <p className={errorClassName} role="alert">
          No pudimos cargar tus horarios. Intenta nuevamente.
        </p>
        <Button
          className="mt-4"
          onClick={() =>
            void Promise.all([
              session.refetch(),
              barbers.refetch(),
              ...(!canManage && isBarber ? [ownBarber.refetch()] : []),
            ])
          }
        >
          Reintentar
        </Button>
      </main>
    )
  }
  if (!canManage && !isBarber) {
    return <main className="mx-auto max-w-360 px-4 py-8">No tienes acceso a esta sección.</main>
  }

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b border-lou-fog pb-7">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
          Agenda del equipo
        </p>
        <h1 className="m-0 font-display text-5xl leading-[0.9] font-bold sm:text-6xl">
          Disponibilidad
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
          {canManage
            ? 'Organiza los turnos de cada barbero y registra ausencias sin perder las citas existentes.'
            : 'Consulta tus turnos y cambios de disponibilidad. Para modificarlos, habla con administración.'}
        </p>
      </header>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        {canManage ? (
          <label className={cn(labelClassName, 'w-full max-w-sm')}>
            Barbero
            <select
              className={fieldClassName}
              value={selectedBarberId}
              onChange={(event) => {
                setBarberSelection(event.target.value)
                setEditor(null)
              }}
            >
              {(barbers.data ?? []).map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.displayName}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div>
            <p className="text-xs font-bold tracking-[0.15em] text-lou-graphite/50 uppercase">
              Mi horario
            </p>
            <p className="font-display text-2xl font-bold">
              {selectedBarber?.displayName ?? 'Barbero'}
            </p>
          </div>
        )}
        <p className="rounded-xl border border-lou-fog bg-white px-3 py-2 text-xs font-semibold text-lou-graphite/65">
          Sucursal: 08:00–13:00 y 15:00–21:00 · inicios cada 30 min
        </p>
      </div>

      {!online && (
        <p
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
          role="status"
        >
          Sin conexión: puedes consultar datos guardados, pero no cambiar horarios ni excepciones.
        </p>
      )}
      {notice && (
        <p
          className={cn(
            'mt-5',
            noticeIsError
              ? errorClassName
              : 'rounded-xl border border-emerald-800/20 bg-emerald-50 p-3 text-sm font-semibold text-emerald-950',
          )}
          role={noticeIsError ? 'alert' : 'status'}
        >
          {notice}
        </p>
      )}
      {conflicts.length > 0 && (
        <aside
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
          role="alert"
        >
          <strong>{conflicts.length} cita(s) existente(s) requieren revisión.</strong>
          <p>No fueron canceladas. Revísalas en la agenda antes de continuar.</p>
        </aside>
      )}

      <div
        className="sticky top-0 z-10 mt-6 border-b border-lou-fog bg-lou-paper/95 py-2 backdrop-blur-sm"
        role="tablist"
        aria-label="Secciones de disponibilidad"
      >
        <div className="grid grid-cols-3 gap-1 sm:flex">
          {views.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={view === item.id}
              aria-controls={`scheduling-panel-${item.id}`}
              id={`scheduling-tab-${item.id}`}
              className={cn(
                'min-h-11 rounded-xl px-2 text-xs font-bold transition-colors duration-200 sm:px-4 sm:text-sm',
                view === item.id
                  ? 'bg-lou-ink text-white'
                  : 'text-lou-graphite/60 hover:bg-white hover:text-lou-ink',
              )}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {!selectedBarberId ? (
        <p className={cn('mt-6', panelClassName)} role="status">
          No hay un perfil de barbero disponible para esta cuenta.
        </p>
      ) : view === 'week' ? (
        <section
          id="scheduling-panel-week"
          role="tabpanel"
          aria-labelledby="scheduling-tab-week"
          className="mt-6 space-y-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-bold">
                Semana del&nbsp;{localDate(weekStart)}
              </h2>
              <p className="text-sm text-lou-graphite/55">
                Turnos vigentes y excepciones en su fecha.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                aria-label="Semana anterior"
                onClick={() => setWeekOffset((offset) => offset - 1)}
              >
                <AppIcon name="arrow-left" size={17} />
              </Button>
              <Button variant="secondary" onClick={() => setWeekOffset(0)}>
                Esta semana
              </Button>
              <Button
                variant="secondary"
                aria-label="Semana siguiente"
                onClick={() => setWeekOffset((offset) => offset + 1)}
              >
                <AppIcon name="arrow-right" size={17} />
              </Button>
            </div>
          </div>
          {schedules.isPending || exceptions.isPending ? (
            <WeekSkeleton />
          ) : schedules.isError || exceptions.isError ? (
            <p className={errorClassName} role="alert">
              No pudimos cargar la semana.{' '}
              <button
                className="font-bold underline"
                onClick={() => void Promise.all([schedules.refetch(), exceptions.refetch()])}
              >
                Reintentar
              </button>
            </p>
          ) : (
            <div className="grid gap-2 lg:grid-cols-7">
              {weekDates.map((date, index) => {
                const daySchedules = (schedules.data ?? []).filter((item) =>
                  scheduleAppliesOn(item, date),
                )
                const dayExceptions = (exceptions.data ?? []).filter((item) =>
                  exceptionAppliesOn(item, date),
                )
                return (
                  <article
                    key={date}
                    className={cn(
                      'min-h-24 rounded-2xl border p-4 lg:min-h-36',
                      date === today
                        ? 'border-lou-ink bg-white shadow-lou-sm'
                        : 'border-lou-fog bg-white/75',
                    )}
                  >
                    <div className="mb-3 flex items-baseline justify-between gap-2 lg:block">
                      <h3 className="font-display text-xl font-bold">{weekdayLabels[index]}</h3>
                      <time dateTime={date} className="text-xs font-semibold text-lou-graphite/55">
                        {localDate(date)}
                      </time>
                    </div>
                    <div className="flex flex-wrap gap-1.5 lg:block lg:space-y-1.5">
                      {daySchedules.length ? (
                        daySchedules.map((item) => (
                          <p
                            key={item.id}
                            className="rounded-lg bg-lou-paper px-2 py-1.5 text-xs font-bold tabular-nums"
                          >
                            {item.startLocalTime.slice(0, 5)}–{item.endLocalTime.slice(0, 5)}
                          </p>
                        ))
                      ) : (
                        <p className="text-xs text-lou-graphite/50">Sin turno</p>
                      )}
                      {dayExceptions.map((item) => (
                        <p
                          key={item.id}
                          className={cn(
                            'rounded-lg px-2 py-1.5 text-xs font-semibold',
                            item.kind === 'UNAVAILABLE'
                              ? 'bg-amber-50 text-amber-950'
                              : 'bg-emerald-50 text-emerald-950',
                          )}
                        >
                          {exceptionLabel(item.kind)} · {localTime(item.startsAt)}–
                          {localTime(item.endsAt)}
                        </p>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          )}
          <div className={panelClassName}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl font-bold">Horarios registrados</h2>
                <p className="text-sm text-lou-graphite/55">
                  Vigencia, estado y cambios sin borrar historial.
                </p>
              </div>
              {canManage && (
                <Button disabled={!online} onClick={() => setEditor({ type: 'schedule' })}>
                  Agregar turno
                </Button>
              )}
            </div>
            {schedules.isPending ? (
              <p className="mt-5 text-sm" role="status">
                Cargando horarios…
              </p>
            ) : schedules.isError ? (
              <p className={cn('mt-5', errorClassName)} role="alert">
                No se pudieron cargar los horarios.
              </p>
            ) : schedules.data?.length ? (
              <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {schedules.data.map((item) => (
                  <article key={item.id} className="rounded-xl border border-lou-fog p-4">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-display text-xl font-bold">
                        {weekdayLabels[item.weekday - 1]}
                      </h3>
                      <span
                        className={cn(
                          'h-fit rounded-full px-2 py-1 text-[0.65rem] font-bold',
                          item.active
                            ? 'bg-emerald-50 text-emerald-950'
                            : 'bg-lou-fog text-lou-graphite/65',
                        )}
                      >
                        {item.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="mt-1 text-lg font-bold tabular-nums">
                      {item.startLocalTime.slice(0, 5)}–{item.endLocalTime.slice(0, 5)}
                    </p>
                    <p className="mt-1 text-xs text-lou-graphite/55">
                      Desde {localDate(item.validFrom)}
                      {item.validTo ? ` · hasta ${localDate(item.validTo)}` : ' · sin fecha final'}
                    </p>
                    {canManage && (
                      <Button
                        className="mt-4"
                        variant="secondary"
                        disabled={!online}
                        onClick={() => setEditor({ type: 'schedule', value: item })}
                      >
                        Editar turno
                      </Button>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mt-5 text-sm text-lou-graphite/55">
                Aún no hay horarios registrados para este barbero.
              </p>
            )}
          </div>
        </section>
      ) : view === 'search' ? (
        <AvailabilitySearch
          key={selectedBarberId}
          selectedBarberId={selectedBarberId}
          barberName={selectedBarber?.displayName ?? 'Barbero'}
          today={today}
        />
      ) : (
        <section
          id="scheduling-panel-exceptions"
          role="tabpanel"
          aria-labelledby="scheduling-tab-exceptions"
          className="mt-6 space-y-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-3xl font-bold">Excepciones próximas</h2>
              <p className="text-sm text-lou-graphite/55">
                Ausencias y horarios extraordinarios aparecen también en la semana.
              </p>
            </div>
            {canManage && (
              <Button disabled={!online} onClick={() => setEditor({ type: 'exception' })}>
                Nueva excepción
              </Button>
            )}
          </div>
          {exceptions.isPending ? (
            <p className={panelClassName} role="status">
              Cargando excepciones…
            </p>
          ) : exceptions.isError ? (
            <p className={errorClassName} role="alert">
              No se pudieron cargar las excepciones.{' '}
              <button className="font-bold underline" onClick={() => void exceptions.refetch()}>
                Reintentar
              </button>
            </p>
          ) : upcomingExceptions.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {upcomingExceptions.map((item) => (
                <ExceptionCard
                  key={item.id}
                  item={item}
                  canManage={canManage}
                  online={online}
                  busy={busy}
                  onDeactivate={() =>
                    void execute(
                      () => schedulingApi.deactivateException(item),
                      'Excepción desactivada.',
                    )
                  }
                />
              ))}
            </div>
          ) : (
            <p className={panelClassName}>No hay excepciones próximas para este barbero.</p>
          )}
          {(exceptions.data ?? []).some((item) => !isUpcomingException(item)) && (
            <details className={panelClassName}>
              <summary className="cursor-pointer font-bold">Ver historial de excepciones</summary>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {(exceptions.data ?? [])
                  .filter((item) => !isUpcomingException(item))
                  .map((item) => (
                    <ExceptionCard
                      key={item.id}
                      item={item}
                      canManage={false}
                      online={online}
                      busy={busy}
                      onDeactivate={() => {}}
                    />
                  ))}
              </div>
            </details>
          )}
        </section>
      )}

      {editor?.type === 'schedule' && (
        <AgendaDialog label={editor.value ? 'Editar turno' : 'Agregar turno'}>
          <ScheduleEditor
            key={editor.value?.id ?? 'new'}
            value={editor.value}
            today={today}
            busy={busy}
            online={online}
            onClose={() => setEditor(null)}
            onSave={(input) =>
              void execute(
                () =>
                  editor.value
                    ? schedulingApi.updateSchedule(editor.value, input)
                    : schedulingApi.createSchedule(selectedBarberId, {
                        weekday: input.weekday,
                        startLocalTime: input.startLocalTime,
                        endLocalTime: input.endLocalTime,
                        validFrom: input.validFrom,
                        ...(input.validTo ? { validTo: input.validTo } : {}),
                      }),
                editor.value ? 'Turno actualizado.' : 'Turno agregado.',
              )
            }
          />
        </AgendaDialog>
      )}
      {editor?.type === 'exception' && (
        <AgendaDialog label="Nueva excepción">
          <ExceptionEditor
            today={today}
            busy={busy}
            online={online}
            onClose={() => setEditor(null)}
            onSave={(input) =>
              void execute(
                () => schedulingApi.createException(selectedBarberId, input),
                'Excepción guardada.',
              )
            }
          />
        </AgendaDialog>
      )}
    </main>
  )
}

const WeekSkeleton = () => (
  <div className="grid gap-2 lg:grid-cols-7" role="status" aria-label="Cargando semana">
    {weekdayLabels.map((day) => (
      <div key={day} className="h-36 animate-pulse rounded-2xl border border-lou-fog bg-white p-4">
        <div className="h-5 w-20 rounded bg-lou-fog" />
        <div className="mt-5 h-8 w-full rounded bg-lou-fog" />
      </div>
    ))}
  </div>
)

const ExceptionCard = ({
  item,
  canManage,
  online,
  busy,
  onDeactivate,
}: {
  item: AvailabilityException
  canManage: boolean
  online: boolean
  busy: boolean
  onDeactivate: () => void
}) => (
  <article className={panelClassName}>
    <div className="flex flex-wrap justify-between gap-2">
      <h3 className="font-display text-xl font-bold">{exceptionLabel(item.kind)}</h3>
      <span
        className={cn(
          'rounded-full px-2 py-1 text-xs font-bold',
          item.active ? 'bg-emerald-50 text-emerald-950' : 'bg-lou-fog text-lou-graphite/60',
        )}
      >
        {item.active ? 'Activa' : 'Inactiva'}
      </span>
    </div>
    <p className="mt-3 text-sm font-bold">
      {localDateTime(item.startsAt)} → {localDateTime(item.endsAt)}
    </p>
    <p className="mt-2 text-sm text-lou-graphite/60">{item.reason}</p>
    {canManage && item.active && (
      <Button
        className="mt-4"
        variant="secondary"
        disabled={!online || busy}
        onClick={onDeactivate}
      >
        Desactivar excepción
      </Button>
    )}
  </article>
)

const ScheduleEditor = ({
  value,
  today,
  busy,
  online,
  onClose,
  onSave,
}: {
  value: WorkingSchedule | undefined
  today: string
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (input: ScheduleUpdate) => void
}) => {
  const [weekday, setWeekday] = useState(value?.weekday ?? 1)
  const [start, setStart] = useState(value?.startLocalTime.slice(0, 5) ?? '08:00')
  const [end, setEnd] = useState(value?.endLocalTime.slice(0, 5) ?? '13:00')
  const [validFrom, setValidFrom] = useState(value?.validFrom ?? today)
  const [validTo, setValidTo] = useState(value?.validTo ?? '')
  const [active, setActive] = useState(value?.active ?? true)
  const validHours =
    (start >= '08:00' && end <= '13:00' && start < end) ||
    (start >= '15:00' && end <= '21:00' && start < end)
  const validDates = !validTo || validTo >= validFrom
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (validHours && validDates)
      onSave({
        weekday,
        startLocalTime: start,
        endLocalTime: end,
        validFrom,
        ...(validTo ? { validTo } : {}),
        active,
      })
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-lou-graphite/50 uppercase">
            Horario semanal
          </p>
          <h2 className="font-display text-3xl font-bold">
            {value ? 'Editar turno' : 'Agregar turno'}
          </h2>
        </div>
        <Button type="button" variant="ghost" aria-label="Cerrar panel" onClick={onClose}>
          <AppIcon name="close" size={20} />
        </Button>
      </div>
      <p className="text-sm text-lou-graphite/60">
        Cada bloque debe caber completo en 08:00–13:00 o 15:00–21:00.
      </p>
      <label className={labelClassName}>
        Día de la semana
        <select
          className={fieldClassName}
          value={weekday}
          onChange={(event) => setWeekday(Number(event.target.value))}
        >
          {weekdayLabels.map((label, index) => (
            <option key={label} value={index + 1}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClassName}>
          Inicio
          <input
            className={fieldClassName}
            type="time"
            step="1800"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>
        <label className={labelClassName}>
          Fin
          <input
            className={fieldClassName}
            type="time"
            step="1800"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </label>
      </div>
      {!validHours && (
        <p className={errorClassName} role="alert">
          El turno debe permanecer dentro de una sola ventana de apertura.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClassName}>
          Vigente desde
          <input
            className={fieldClassName}
            type="date"
            value={validFrom}
            onChange={(event) => setValidFrom(event.target.value)}
            required
          />
        </label>
        <label className={labelClassName}>
          Hasta (opcional)
          <input
            className={fieldClassName}
            type="date"
            min={validFrom}
            value={validTo}
            onChange={(event) => setValidTo(event.target.value)}
          />
        </label>
      </div>
      {!validDates && (
        <p className={errorClassName} role="alert">
          La fecha final no puede ser anterior al inicio.
        </p>
      )}
      {value && (
        <label className="flex items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
            className="size-5 accent-lou-ink"
          />
          Turno activo
        </label>
      )}
      <Button type="submit" width="full" disabled={!online || busy || !validHours || !validDates}>
        {busy ? 'Guardando…' : value ? 'Guardar cambios' : 'Agregar turno'}
      </Button>
    </form>
  )
}

const ExceptionEditor = ({
  today,
  busy,
  online,
  onClose,
  onSave,
}: {
  today: string
  busy: boolean
  online: boolean
  onClose: () => void
  onSave: (input: { startsAt: string; endsAt: string; kind: ExceptionKind; reason: string }) => void
}) => {
  const [kind, setKind] = useState<ExceptionKind>('UNAVAILABLE')
  const [start, setStart] = useState(`${today}T09:00`)
  const [end, setEnd] = useState(`${today}T10:00`)
  const [reason, setReason] = useState('')
  const validRange = end > start
  const extraordinaryWithinHours =
    kind !== 'AVAILABLE_OVERRIDE' ||
    (start.slice(0, 10) === end.slice(0, 10) &&
      ((start.slice(11) >= '08:00' && end.slice(11) <= '13:00') ||
        (start.slice(11) >= '15:00' && end.slice(11) <= '21:00')))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (validRange && extraordinaryWithinHours && reason.trim())
      onSave({
        startsAt: businessLocalToIso(start),
        endsAt: businessLocalToIso(end),
        kind,
        reason: reason.trim(),
      })
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.15em] text-lou-graphite/50 uppercase">
            Cambio puntual
          </p>
          <h2 className="font-display text-3xl font-bold">Nueva excepción</h2>
        </div>
        <Button type="button" variant="ghost" aria-label="Cerrar panel" onClick={onClose}>
          <AppIcon name="close" size={20} />
        </Button>
      </div>
      <label className={labelClassName}>
        Tipo
        <select
          className={fieldClassName}
          value={kind}
          onChange={(event) => setKind(event.target.value as ExceptionKind)}
        >
          <option value="UNAVAILABLE">Ausencia o bloqueo</option>
          <option value="AVAILABLE_OVERRIDE">Horario extraordinario</option>
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClassName}>
          Inicio
          <input
            className={fieldClassName}
            type="datetime-local"
            step="1800"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            required
          />
        </label>
        <label className={labelClassName}>
          Fin
          <input
            className={fieldClassName}
            type="datetime-local"
            step="1800"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            required
          />
        </label>
      </div>
      {!validRange && (
        <p className={errorClassName} role="alert">
          El fin debe ser posterior al inicio.
        </p>
      )}
      {!extraordinaryWithinHours && (
        <p className={errorClassName} role="alert">
          El horario extraordinario debe caber en una ventana de apertura del mismo día.
        </p>
      )}
      <label className={labelClassName}>
        Motivo
        <input
          className={fieldClassName}
          maxLength={300}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          required
        />
      </label>
      <p className="text-sm text-lou-graphite/60">
        Si hay citas afectadas, aparecerán para revisión; no se cancelan automáticamente.
      </p>
      <Button
        type="submit"
        width="full"
        disabled={!online || busy || !validRange || !extraordinaryWithinHours || !reason.trim()}
      >
        {busy ? 'Guardando…' : 'Guardar excepción'}
      </Button>
    </form>
  )
}

const AvailabilitySearch = ({
  selectedBarberId,
  barberName,
  today,
}: {
  selectedBarberId: string
  barberName: string
  today: string
}) => {
  const services = useQuery({
    queryKey: ['scheduling', 'services'],
    queryFn: schedulingApi.listServices,
  })
  const [serviceId, setServiceId] = useState('')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(today)
  const [search, setSearch] = useState<{
    serviceId: string
    barberId: string
    dateFrom: string
    dateTo: string
  }>()
  const availability = useQuery({
    queryKey: ['availability', search],
    queryFn: () => schedulingApi.search(search!),
    enabled: Boolean(search),
  })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (serviceId && dateTo >= dateFrom)
      setSearch({ serviceId, barberId: selectedBarberId, dateFrom, dateTo })
  }
  return (
    <section
      id="scheduling-panel-search"
      role="tabpanel"
      aria-labelledby="scheduling-tab-search"
      className="mt-6 grid gap-5 lg:grid-cols-[minmax(18rem,0.75fr)_minmax(0,1.25fr)]"
    >
      <form onSubmit={submit} className={cn(panelClassName, 'h-fit space-y-4')}>
        <div>
          <h2 className="font-display text-2xl font-bold">Buscar un espacio</h2>
          <p className="text-sm text-lou-graphite/55">
            Para {barberName}, según servicio, turnos y citas.
          </p>
        </div>
        <label className={labelClassName}>
          Servicio
          <select
            className={fieldClassName}
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            required
          >
            <option value="">Selecciona un servicio</option>
            {services.data
              ?.filter((item) => item.active)
              .map((item) => (
                <option value={item.id} key={item.id}>
                  {item.name} · {item.defaultDurationMinutes} min
                </option>
              ))}
          </select>
        </label>
        {services.isError && (
          <p className={errorClassName} role="alert">
            No se pudieron cargar los servicios.{' '}
            <button
              type="button"
              className="font-bold underline"
              onClick={() => void services.refetch()}
            >
              Reintentar
            </button>
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          <label className={labelClassName}>
            Desde
            <input
              className={fieldClassName}
              type="date"
              min={today}
              value={dateFrom}
              onChange={(event) => {
                setDateFrom(event.target.value)
                if (dateTo < event.target.value) setDateTo(event.target.value)
              }}
              required
            />
          </label>
          <label className={labelClassName}>
            Hasta
            <input
              className={fieldClassName}
              type="date"
              min={dateFrom}
              max={addCalendarDays(dateFrom, 30)}
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              required
            />
          </label>
        </div>
        <Button type="submit" width="full" disabled={services.isPending || !serviceId}>
          Buscar disponibilidad
        </Button>
      </form>
      <div className={panelClassName} aria-live="polite">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Espacios disponibles</h2>
          <span className="text-xs font-bold text-lou-graphite/50">
            {availability.data?.length ?? 0}
          </span>
        </div>
        {!search ? (
          <p className="mt-5 text-sm text-lou-graphite/55">
            Elige un servicio y una fecha para consultar.
          </p>
        ) : availability.isPending ? (
          <p className="mt-5 text-sm" role="status">
            Calculando horarios…
          </p>
        ) : availability.isError ? (
          <p className={cn('mt-5', errorClassName)} role="alert">
            {messageFor(availability.error)}{' '}
            <button className="font-bold underline" onClick={() => void availability.refetch()}>
              Reintentar
            </button>
          </p>
        ) : availability.data?.length ? (
          <div className="mt-4 grid max-h-[38rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
            {availability.data.map((slot) => (
              <article
                key={`${slot.barberId}-${slot.startsAt}`}
                className="rounded-xl border border-lou-fog p-3"
              >
                <p className="text-xs font-semibold text-lou-graphite/55">
                  {localDate(businessDateFromIso(slot.startsAt))}
                </p>
                <div className="mt-1 flex justify-between gap-3">
                  <strong className="font-display text-xl tabular-nums">
                    {localTime(slot.startsAt)}–{localTime(slot.endsAt)}
                  </strong>
                  <span className="text-sm font-bold">{centsToBolivianos(slot.priceCents)}</span>
                </div>
                <p className="text-xs text-lou-graphite/55">
                  {slot.durationMinutes} min · {slot.barberName}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-lou-graphite/55">No hay espacios para estos filtros.</p>
        )}
      </div>
    </section>
  )
}
