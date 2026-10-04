import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  businessDateFromIso,
  todayInBusinessTime,
  type AppointmentConflict,
  type ExceptionKind,
  type WorkingSchedule,
} from '../../core/scheduling/Scheduling'
import { ApiError } from '../../infrastructure/http/apiClient'
import { authApi } from '../../infrastructure/http/authApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AgendaDialog } from '../components/AgendaDialog'
import { AppIcon } from '../components/AppIcon'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { Toast } from '../components/Toast'
import { ExceptionEditor, ShiftEditor } from '../components/availability/AvailabilityEditors'
import { ExceptionList } from '../components/availability/ExceptionList'
import { WeeklySchedule } from '../components/availability/WeeklySchedule'
import { buttonStyles } from '../components/buttonStyles'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

type Editor =
  | { type: 'shift'; value?: WorkingSchedule | undefined; weekday: number }
  | { type: 'exception'; kind: ExceptionKind }
  | null

const messageFor = (error: unknown) =>
  error instanceof ApiError
    ? (error.problem.detail ?? error.problem.title)
    : 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.'

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full border-2 py-1 pr-4 pl-1.5 font-semibold transition-colors duration-150',
    active
      ? 'border-ink bg-ink text-on-ink'
      : 'border-transparent bg-surface shadow-raised hover:border-line-control',
  )

const Section = ({
  id,
  title,
  actions,
  children,
}: {
  id: string
  title: string
  actions?: ReactNode
  children: ReactNode
}) => (
  <section className="rounded-panel bg-surface p-5 shadow-raised sm:p-6" aria-labelledby={id}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="font-display text-2xl font-extrabold sm:text-3xl">
        {title}
      </h2>
      {actions}
    </div>
    {children}
  </section>
)

export const SchedulingPage = () => {
  const today = todayInBusinessTime()
  const online = useConnectivity() === 'online'
  const queryClient = useQueryClient()
  const [barberSelection, setBarberSelection] = useState('')
  const [editor, setEditor] = useState<Editor>(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [conflicts, setConflicts] = useState<AppointmentConflict[]>([])
  const [busy, setBusy] = useState(false)
  const clearNotice = useCallback(() => setNotice(''), [])

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

  const execute = async (
    action: () => Promise<{ conflicts: AppointmentConflict[] }>,
    successMessage: string,
  ) => {
    if (!online || !canManage) return
    setBusy(true)
    setError('')
    setConflicts([])
    try {
      const result = await action()
      await queryClient.invalidateQueries({ queryKey: ['scheduling'] })
      await queryClient.invalidateQueries({ queryKey: ['availability'] })
      setConflicts(result.conflicts)
      setNotice(successMessage)
      setEditor(null)
    } catch (caught) {
      setError(messageFor(caught))
    } finally {
      setBusy(false)
    }
  }

  const loading =
    session.isPending ||
    (session.isSuccess && (barbers.isPending || (!canManage && isBarber && ownBarber.isPending)))
  const failed = session.isError || barbers.isError || (!canManage && ownBarber.isError)

  if (session.isSuccess && !canManage && !isBarber) {
    return (
      <main className="mx-auto w-full max-w-360 px-4 py-8">
        <p className={warningClassName}>No tienes acceso a esta sección.</p>
      </main>
    )
  }

  const firstConflictDate = conflicts[0] ? businessDateFromIso(conflicts[0].startsAt) : undefined
  const disabled = !online || busy

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold sm:text-6xl">
            {canManage ? 'Disponibilidad' : 'Mi horario'}
          </h1>
          <p className="mt-2 text-lg text-pretty text-ink-soft">
            La barbería abre de 08:00 a 13:00 y de 15:00 a 21:00.
            {!canManage && ' Para cambiar tu horario, habla con administración.'}
          </p>
        </div>
      </header>

      {canManage && barbers.data && barbers.data.length > 0 && (
        <div
          className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          role="group"
          aria-label="Barbero"
        >
          {barbers.data.map((barber) => {
            const active = barber.id === selectedBarberId
            return (
              <button
                key={barber.id}
                type="button"
                className={chipClassName(active)}
                aria-pressed={active}
                onClick={() => {
                  setBarberSelection(barber.id)
                  setEditor(null)
                  setConflicts([])
                }}
              >
                <Avatar name={barber.displayName} size="sm" tone={active ? 'neutral' : 'ink'} />
                {barber.displayName}
              </button>
            )
          })}
        </div>
      )}

      {!online && (
        <p className={cn(warningClassName, 'mt-4')} role="status">
          Sin conexión. Puedes ver los horarios, pero no cambiarlos hasta volver a conectarte.
        </p>
      )}
      {error && (
        <p className={cn(errorClassName, 'mt-4')} role="alert">
          {error}
        </p>
      )}
      {conflicts.length > 0 && (
        <div
          className={cn(warningClassName, 'mt-4 flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          <span>
            {conflicts.length === 1
              ? '1 cita queda fuera del nuevo horario.'
              : `${conflicts.length} citas quedan fuera del nuevo horario.`}{' '}
            No se cancelaron: revísalas y reprográmalas si hace falta.
          </span>
          <Link
            className={buttonStyles({ variant: 'secondary', size: 'sm' })}
            to={`/app/agenda${firstConflictDate ? `?fecha=${firstConflictDate}` : ''}`}
          >
            Revisarlas en la agenda
          </Link>
        </div>
      )}

      {loading && (
        <div className="mt-6 grid gap-6" role="status" aria-label="Cargando horarios">
          <div className="h-96 animate-pulse rounded-panel bg-surface-strong" />
        </div>
      )}
      {failed && (
        <div
          className={cn(errorClassName, 'mt-6 flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          No pudimos cargar los horarios.
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void Promise.all([session.refetch(), barbers.refetch(), ownBarber.refetch()])
            }
          >
            Reintentar
          </Button>
        </div>
      )}
      {!loading && !failed && !selectedBarberId && (
        <p className={cn(warningClassName, 'mt-6')}>
          No hay un perfil de barbero asociado a esta cuenta.
        </p>
      )}

      {selectedBarberId && (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <Section
            id="weekly-title"
            title={`Horario semanal${selectedBarber && canManage ? ` de ${selectedBarber.displayName.split(' ')[0]}` : ''}`}
          >
            {schedules.isPending ? (
              <div
                className="h-80 animate-pulse rounded-control bg-surface-muted"
                role="status"
                aria-label="Cargando turnos"
              />
            ) : schedules.isError ? (
              <div
                className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
                role="alert"
              >
                No pudimos cargar los turnos.
                <Button variant="secondary" size="sm" onClick={() => void schedules.refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <WeeklySchedule
                schedules={schedules.data}
                today={today}
                canManage={canManage}
                disabled={disabled}
                onEdit={(value) => setEditor({ type: 'shift', value, weekday: value.weekday })}
                onAdd={(weekday) => setEditor({ type: 'shift', weekday })}
              />
            )}
          </Section>

          <Section
            id="exceptions-title"
            title="Ausencias y horarios especiales"
            actions={
              canManage && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={disabled}
                    onClick={() => setEditor({ type: 'exception', kind: 'UNAVAILABLE' })}
                  >
                    <AppIcon name="plus" size={18} />
                    Registrar ausencia
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={disabled}
                    onClick={() => setEditor({ type: 'exception', kind: 'AVAILABLE_OVERRIDE' })}
                  >
                    Horario especial
                  </Button>
                </div>
              )
            }
          >
            {exceptions.isPending ? (
              <div
                className="h-32 animate-pulse rounded-control bg-surface-muted"
                role="status"
                aria-label="Cargando ausencias"
              />
            ) : exceptions.isError ? (
              <div
                className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
                role="alert"
              >
                No pudimos cargar las ausencias.
                <Button variant="secondary" size="sm" onClick={() => void exceptions.refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <ExceptionList
                exceptions={exceptions.data}
                today={today}
                canManage={canManage}
                busy={busy}
                disabled={disabled}
                onRemove={(item) =>
                  void execute(
                    () => schedulingApi.deactivateException(item),
                    'Se quitó la ausencia',
                  )
                }
              />
            )}
          </Section>
        </div>
      )}

      {editor?.type === 'shift' && (
        <AgendaDialog
          label={editor.value ? 'Editar turno' : 'Agregar turno'}
          onClose={() => setEditor(null)}
        >
          <ShiftEditor
            key={editor.value?.id ?? `new-${editor.weekday}`}
            value={editor.value}
            weekday={editor.weekday}
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
                editor.value ? 'Turno actualizado' : 'Turno agregado',
              )
            }
          />
        </AgendaDialog>
      )}
      {editor?.type === 'exception' && (
        <AgendaDialog label="Registrar ausencia u horario especial" onClose={() => setEditor(null)}>
          <ExceptionEditor
            kind={editor.kind}
            today={today}
            busy={busy}
            online={online}
            onClose={() => setEditor(null)}
            onSave={(input) =>
              void execute(
                () => schedulingApi.createException(selectedBarberId, input),
                input.kind === 'UNAVAILABLE' ? 'Ausencia registrada' : 'Horario especial guardado',
              )
            }
          />
        </AgendaDialog>
      )}
      <Toast message={notice} onDone={clearNotice} />
    </main>
  )
}
