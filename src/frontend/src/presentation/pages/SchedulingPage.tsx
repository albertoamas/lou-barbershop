import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import {
  addCalendarDays,
  businessLocalToIso,
  todayInBusinessTime,
  weekdayLabels,
  type AppointmentConflict,
  type ExceptionKind,
} from '../../core/scheduling/Scheduling'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { useConnectivity } from '../hooks/useConnectivity'

type View = 'availability' | 'schedules' | 'exceptions'

const messageFor = (error: unknown) =>
  error instanceof ApiError
    ? (error.problem.detail ?? error.problem.title)
    : 'No se pudo completar la acción. Intenta nuevamente.'

const localDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

const localTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))

export const SchedulingPage = () => {
  const today = todayInBusinessTime()
  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })
  const barbers = useQuery({
    queryKey: ['scheduling', 'barbers'],
    queryFn: schedulingApi.listBarbers,
  })
  const services = useQuery({
    queryKey: ['scheduling', 'services'],
    queryFn: schedulingApi.listServices,
  })
  const [view, setView] = useState<View>('availability')
  const [barberId, setBarberId] = useState('any')
  const [serviceId, setServiceId] = useState('')
  const [dateFrom, setDateFrom] = useState(today)
  const [dateTo, setDateTo] = useState(addCalendarDays(today, 6))
  const [search, setSearch] = useState({
    serviceId: '',
    barberId: 'any',
    dateFrom: today,
    dateTo: today,
  })
  const [searched, setSearched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([])
  const connectivity = useConnectivity()
  const queryClient = useQueryClient()
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const selectedBarber = barberId === 'any' ? (barbers.data?.[0]?.id ?? '') : barberId

  const availability = useQuery({
    queryKey: ['availability', search],
    queryFn: () => schedulingApi.search(search),
    enabled: searched && Boolean(search.serviceId),
  })
  const schedules = useQuery({
    queryKey: ['scheduling', 'schedules', selectedBarber],
    queryFn: () => schedulingApi.listSchedules(selectedBarber),
    enabled: Boolean(selectedBarber) && view === 'schedules',
  })
  const exceptions = useQuery({
    queryKey: ['scheduling', 'exceptions', selectedBarber],
    queryFn: () => schedulingApi.listExceptions(selectedBarber),
    enabled: Boolean(selectedBarber) && view === 'exceptions',
  })

  const execute = async (action: () => Promise<{ conflicts: AppointmentConflict[] }>) => {
    if (connectivity !== 'online') {
      setNotice('La agenda solo puede modificarse con conexión.')
      return
    }
    setNotice('')
    setConflicts([])
    setBusy(true)
    try {
      const result = await action()
      setConflicts(result.conflicts)
      setNotice('Cambio guardado correctamente.')
      await queryClient.invalidateQueries({ queryKey: ['scheduling'] })
      await queryClient.invalidateQueries({ queryKey: ['availability'] })
    } catch (error) {
      setNotice(messageFor(error))
    } finally {
      setBusy(false)
    }
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    setSearched(true)
    setSearch({ serviceId, barberId, dateFrom, dateTo })
  }

  if (barbers.isPending || services.isPending)
    return (
      <main className="content scheduling-page" aria-busy="true">
        Cargando agenda…
      </main>
    )
  if (barbers.isError || services.isError)
    return (
      <main className="content scheduling-page">
        <h1>No pudimos cargar la agenda.</h1>
        <button className="primary-button" onClick={() => void barbers.refetch()}>
          Reintentar
        </button>
      </main>
    )

  return (
    <main className="content scheduling-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">R2 · Agenda confiable</p>
          <h1>El tiempo disponible, sin suposiciones.</h1>
          <p className="lead">
            Consulta horarios reales según duración, vigencia, ausencias y citas activas.
          </p>
        </div>
        <span className="history-badge">Zona horaria: America/La_Paz · intervalos cada 15 min</span>
      </div>

      <nav className="section-tabs" aria-label="Secciones de agenda">
        <button
          aria-current={view === 'availability' ? 'page' : undefined}
          onClick={() => setView('availability')}
        >
          Disponibilidad
        </button>
        <button
          aria-current={view === 'schedules' ? 'page' : undefined}
          onClick={() => setView('schedules')}
        >
          Horarios
        </button>
        <button
          aria-current={view === 'exceptions' ? 'page' : undefined}
          onClick={() => setView('exceptions')}
        >
          Excepciones
        </button>
      </nav>

      {notice && (
        <p
          className={notice.includes('correctamente') ? 'form-success' : 'form-error'}
          role="status"
        >
          {notice}
        </p>
      )}
      {conflicts.length > 0 && (
        <aside className="conflict-notice" role="alert">
          <strong>{conflicts.length} cita(s) existente(s) quedaron fuera del nuevo horario.</strong>
          <span>No fueron canceladas. Revísalas antes de continuar.</span>
        </aside>
      )}

      {view === 'availability' && (
        <section className="agenda-layout">
          <form className="master-form availability-filter" onSubmit={submitSearch}>
            <h2>Buscar un espacio</h2>
            <label>
              Servicio
              <select
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
                required
              >
                <option value="">Selecciona…</option>
                {services.data
                  ?.filter((x) => x.active)
                  .map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {service.defaultDurationMinutes} min
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Barbero
              <select value={barberId} onChange={(event) => setBarberId(event.target.value)}>
                <option value="any">Cualquier barbero</option>
                {barbers.data?.map((barber) => (
                  <option key={barber.id} value={barber.id}>
                    {barber.displayName}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-pair">
              <label>
                Desde
                <input
                  type="date"
                  min={today}
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  required
                />
              </label>
              <label>
                Hasta
                <input
                  type="date"
                  min={dateFrom}
                  max={addCalendarDays(dateFrom, 30)}
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  required
                />
              </label>
            </div>
            <button className="primary-button">Buscar disponibilidad</button>
          </form>
          <div className="availability-results" aria-live="polite">
            <div className="list-heading">
              <h2>Alternativas</h2>
              <span>{availability.data?.length ?? 0} espacios</span>
            </div>
            {availability.isFetching ? (
              <p className="empty-state">Calculando espacios reales…</p>
            ) : availability.isError ? (
              <p className="form-error">{messageFor(availability.error)}</p>
            ) : availability.data?.length ? (
              availability.data.map((slot) => (
                <article className="slot-card" key={`${slot.barberId}-${slot.startsAt}`}>
                  <time dateTime={slot.startsAt}>
                    <strong>{localTime(slot.startsAt)}</strong>
                    <small>{localDateTime(slot.startsAt).split(',')[0]}</small>
                  </time>
                  <div>
                    <strong>{slot.barberName}</strong>
                    <small>
                      {slot.durationMinutes} min · termina {localTime(slot.endsAt)}
                    </small>
                  </div>
                  <b>{centsToBolivianos(slot.priceCents)}</b>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <span aria-hidden="true">⌁</span>
                <p>
                  {searched
                    ? 'No hay espacios para estos filtros.'
                    : 'Elige un servicio y busca una fecha.'}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {view === 'schedules' && (
        <SchedulesPanel
          barberId={selectedBarber}
          barbers={barbers.data ?? []}
          selected={barberId}
          setSelected={setBarberId}
          schedules={schedules.data ?? []}
          canManage={canManage}
          busy={busy}
          execute={execute}
        />
      )}
      {view === 'exceptions' && (
        <ExceptionsPanel
          barberId={selectedBarber}
          barbers={barbers.data ?? []}
          selected={barberId}
          setSelected={setBarberId}
          exceptions={exceptions.data ?? []}
          canManage={canManage}
          busy={busy}
          execute={execute}
        />
      )}
    </main>
  )
}

type PanelProps = {
  barberId: string
  barbers: { id: string; displayName: string }[]
  selected: string
  setSelected: (value: string) => void
  canManage: boolean
  busy: boolean
  execute: (action: () => Promise<{ conflicts: AppointmentConflict[] }>) => Promise<void>
}

const BarberSelector = ({
  barbers,
  selected,
  setSelected,
}: Pick<PanelProps, 'barbers' | 'selected' | 'setSelected'>) => (
  <label className="barber-selector">
    Barbero
    <select
      value={selected === 'any' ? (barbers[0]?.id ?? '') : selected}
      onChange={(event) => setSelected(event.target.value)}
    >
      {barbers.map((barber) => (
        <option key={barber.id} value={barber.id}>
          {barber.displayName}
        </option>
      ))}
    </select>
  </label>
)

const SchedulesPanel = ({
  barberId,
  barbers,
  selected,
  setSelected,
  schedules,
  canManage,
  busy,
  execute,
}: PanelProps & { schedules: Awaited<ReturnType<typeof schedulingApi.listSchedules>> }) => {
  const today = todayInBusinessTime()
  const [weekday, setWeekday] = useState('1')
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('18:00')
  const [validFrom, setValidFrom] = useState(today)
  const [validTo, setValidTo] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void execute(() =>
      schedulingApi.createSchedule(barberId, {
        weekday: Number(weekday),
        startLocalTime: start,
        endLocalTime: end,
        validFrom,
        ...(validTo ? { validTo } : {}),
      }),
    )
  }
  return (
    <section className="agenda-layout">
      <div>
        {canManage && (
          <form className="master-form" onSubmit={submit}>
            <h2>Nuevo horario semanal</h2>
            <BarberSelector barbers={barbers} selected={selected} setSelected={setSelected} />
            <label>
              Día
              <select value={weekday} onChange={(event) => setWeekday(event.target.value)}>
                {weekdayLabels.map((label, index) => (
                  <option value={index + 1} key={label}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="field-pair">
              <label>
                Inicio
                <input
                  type="time"
                  step="900"
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  required
                />
              </label>
              <label>
                Fin
                <input
                  type="time"
                  step="900"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  required
                />
              </label>
            </div>
            <div className="field-pair">
              <label>
                Vigente desde
                <input
                  type="date"
                  value={validFrom}
                  onChange={(event) => setValidFrom(event.target.value)}
                  required
                />
              </label>
              <label>
                Hasta (opcional)
                <input
                  type="date"
                  min={validFrom}
                  value={validTo}
                  onChange={(event) => setValidTo(event.target.value)}
                />
              </label>
            </div>
            <button className="primary-button" disabled={busy || !barberId}>
              {busy ? 'Guardando…' : 'Agregar horario'}
            </button>
          </form>
        )}
        {!canManage && (
          <BarberSelector barbers={barbers} selected={selected} setSelected={setSelected} />
        )}
      </div>
      <div className="master-list">
        <div className="list-heading">
          <h2>Horario vigente e histórico</h2>
          <span>{schedules.length} bloques</span>
        </div>
        {schedules.length ? (
          schedules.map((schedule) => (
            <article className="master-row" key={schedule.id}>
              <div>
                <strong>
                  {weekdayLabels[schedule.weekday - 1]} · {schedule.startLocalTime.slice(0, 5)}–
                  {schedule.endLocalTime.slice(0, 5)}
                </strong>
                <small>
                  Desde {schedule.validFrom}
                  {schedule.validTo ? ` hasta ${schedule.validTo}` : ''} ·{' '}
                  {schedule.active ? 'Activo' : 'Inactivo'}
                </small>
              </div>
              {canManage && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void execute(() => schedulingApi.updateSchedule(schedule, !schedule.active))
                  }
                >
                  {schedule.active ? 'Desactivar' : 'Reactivar'}
                </button>
              )}
            </article>
          ))
        ) : (
          <p className="empty-state">Aún no hay horarios para este barbero.</p>
        )}
      </div>
    </section>
  )
}

const ExceptionsPanel = ({
  barberId,
  barbers,
  selected,
  setSelected,
  exceptions,
  canManage,
  busy,
  execute,
}: PanelProps & { exceptions: Awaited<ReturnType<typeof schedulingApi.listExceptions>> }) => {
  const today = todayInBusinessTime()
  const [kind, setKind] = useState<ExceptionKind>('UNAVAILABLE')
  const [startsAt, setStartsAt] = useState(`${today}T09:00`)
  const [endsAt, setEndsAt] = useState(`${today}T10:00`)
  const [reason, setReason] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    void execute(() =>
      schedulingApi.createException(barberId, {
        startsAt: businessLocalToIso(startsAt),
        endsAt: businessLocalToIso(endsAt),
        kind,
        reason,
      }),
    )
  }
  return (
    <section className="agenda-layout">
      <div>
        {canManage && (
          <form className="master-form" onSubmit={submit}>
            <h2>Nueva excepción</h2>
            <BarberSelector barbers={barbers} selected={selected} setSelected={setSelected} />
            <label>
              Tipo
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as ExceptionKind)}
              >
                <option value="UNAVAILABLE">Ausencia / bloqueo</option>
                <option value="AVAILABLE_OVERRIDE">Disponibilidad extraordinaria</option>
              </select>
            </label>
            <label>
              Inicio
              <input
                type="datetime-local"
                step="900"
                value={startsAt}
                onChange={(event) => setStartsAt(event.target.value)}
                required
              />
            </label>
            <label>
              Fin
              <input
                type="datetime-local"
                step="900"
                value={endsAt}
                onChange={(event) => setEndsAt(event.target.value)}
                required
              />
            </label>
            <label>
              Motivo
              <input
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
              />
            </label>
            <button className="primary-button" disabled={busy || !barberId}>
              {busy ? 'Guardando…' : 'Guardar excepción'}
            </button>
          </form>
        )}
        {!canManage && (
          <BarberSelector barbers={barbers} selected={selected} setSelected={setSelected} />
        )}
      </div>
      <div className="master-list">
        <div className="list-heading">
          <h2>Excepciones registradas</h2>
          <span>{exceptions.length} registros</span>
        </div>
        {exceptions.length ? (
          exceptions.map((rule) => (
            <article className="master-row" key={rule.id}>
              <div>
                <strong>
                  {rule.kind === 'UNAVAILABLE' ? 'Ausencia' : 'Horario extraordinario'} ·{' '}
                  {localDateTime(rule.startsAt)}
                </strong>
                <small>
                  Hasta {localDateTime(rule.endsAt)} · {rule.reason} ·{' '}
                  {rule.active ? 'Activa' : 'Inactiva'}
                </small>
              </div>
              {canManage && rule.active && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void execute(() => schedulingApi.deactivateException(rule))}
                >
                  Desactivar
                </button>
              )}
            </article>
          ))
        ) : (
          <p className="empty-state">No hay excepciones registradas.</p>
        )}
      </div>
    </section>
  )
}
