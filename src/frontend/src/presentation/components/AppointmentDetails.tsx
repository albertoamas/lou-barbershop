import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  agendaActions,
  agendaTime,
  statusLabels,
  type AgendaAction,
  type Appointment,
  type AppointmentSnapshot,
} from '../../core/agenda/Agenda'
import { timeRangeLabel } from '../../core/agenda/AgendaTimeline'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { salesApi } from '../../infrastructure/http/salesApi'
import type { Operation } from '../../core/sales/Sales'
import { AppIcon } from './AppIcon'
import { Avatar } from './Avatar'
import { Button } from './Button'
import { StatusBadge } from './StatusBadge'
import { statusBadgeTone } from './agenda/appointmentStatusStyles'
import { errorClassName, fieldClassName, labelClassName } from '../styles/formStyles'

const actionLabels: Record<AgendaAction, string> = {
  cancel: 'Cancelar cita',
  'no-show': 'Marcar inasistencia',
  'check-in': 'Registrar llegada',
  start: 'Iniciar atención',
}
const destructive = (action: AgendaAction) => action === 'cancel' || action === 'no-show'

const appointmentDateLabel = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(value))

const describe = (snapshot: AppointmentSnapshot) =>
  `${appointmentDateLabel(snapshot.startsAt)}, de ${timeRangeLabel(snapshot)}. ${statusLabels[snapshot.status]}, ${snapshot.durationMinutes} min, ${centsToBolivianos(snapshot.priceCents)}.`

const eventLabel = (action: string, status: AppointmentSnapshot['status']) =>
  action === 'CREATED'
    ? 'Creación'
    : action === 'RESCHEDULED'
      ? 'Reprogramación'
      : statusLabels[status]

interface Props {
  appointment: Appointment
  canManage: boolean
  disabled: boolean
  onChanged: () => void
  onReschedule: () => void
  onClose: () => void
  onOperationOpened?: (operation: Operation) => void
}

export const AppointmentDetails = ({
  appointment,
  canManage,
  disabled,
  onChanged,
  onReschedule,
  onClose,
  onOperationOpened,
}: Props) => {
  const [action, setAction] = useState<AgendaAction>()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const history = useQuery({
    queryKey: ['agenda', 'history', appointment.id, appointment.version],
    queryFn: () => agendaApi.history(appointment.id),
    enabled: canManage,
  })
  const actions = agendaActions(appointment.status, canManage)
  const forward = actions.filter((item) => !destructive(item))
  const backward = actions.filter(destructive)
  const needsReason = action !== undefined && destructive(action)

  const execute = async () => {
    if (!action || disabled || busy) return
    setBusy(true)
    try {
      await agendaApi.transition(appointment, action, reason)
      onChanged()
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? error.message)
          : 'No se pudo guardar. Recarga para comprobar el estado antes de reintentar.',
      )
    } finally {
      setBusy(false)
    }
  }

  const openOperation = () => {
    setBusy(true)
    void salesApi
      .openAppointment(appointment.id)
      .then((opened) => onOperationOpened?.(opened))
      .catch((error: unknown) =>
        setNotice(
          error instanceof ApiError
            ? (error.problem.detail ?? error.message)
            : 'No se pudo abrir la atención.',
        ),
      )
      .finally(() => setBusy(false))
  }

  return (
    <section className="grid gap-6" aria-label="Detalle de cita">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={appointment.customerName} size="lg" />
          <div className="min-w-0">
            <h2 className="truncate font-display text-3xl leading-none font-extrabold text-balance">
              {appointment.customerName}
            </h2>
            <StatusBadge className="mt-2" tone={statusBadgeTone[appointment.status]}>
              {statusLabels[appointment.status]}
            </StatusBadge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-11 shrink-0 px-0"
          aria-label="Cerrar detalle"
          disabled={busy}
          onClick={onClose}
        >
          <AppIcon name="close" />
        </Button>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3">
        <dt className="text-ink-muted">Servicio</dt>
        <dd className="font-semibold">{appointment.serviceName}</dd>
        <dt className="text-ink-muted">Barbero</dt>
        <dd className="font-semibold">{appointment.barberName}</dd>
        <dt className="text-ink-muted">Fecha</dt>
        <dd className="font-semibold first-letter:uppercase">
          {appointmentDateLabel(appointment.startsAt)}
        </dd>
        <dt className="text-ink-muted">Horario</dt>
        <dd className="font-semibold tabular-nums">{timeRangeLabel(appointment)}</dd>
        {appointment.quotedPriceCents !== null && (
          <>
            <dt className="text-ink-muted">Precio informado</dt>
            <dd className="font-semibold tabular-nums">
              {centsToBolivianos(appointment.quotedPriceCents)}, {appointment.quotedDurationMinutes}{' '}
              min
              <span className="block text-sm font-normal text-ink-muted">
                Se cobra al terminar la atención.
              </span>
            </dd>
          </>
        )}
      </dl>

      <div className="grid gap-3">
        {appointment.status === 'IN_SERVICE' && (
          <Button
            variant="money"
            size="lg"
            width="full"
            disabled={disabled || busy}
            onClick={openOperation}
          >
            Abrir atención y cobro
          </Button>
        )}
        {forward.map((item) => (
          <Button
            key={item}
            size="lg"
            width="full"
            disabled={disabled || busy}
            onClick={() => {
              setAction(item)
              setReason('')
              setNotice('')
            }}
          >
            {actionLabels[item]}
          </Button>
        ))}
        {canManage && appointment.status === 'CONFIRMED' && (
          <Button
            variant="secondary"
            width="full"
            disabled={disabled || busy}
            onClick={onReschedule}
          >
            Reprogramar
          </Button>
        )}
        {backward.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {backward.map((item) => (
              <Button
                key={item}
                variant="dangerSoft"
                disabled={disabled || busy}
                onClick={() => {
                  setAction(item)
                  setReason('')
                  setNotice('')
                }}
              >
                {actionLabels[item]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {action && (
        <form
          className="grid gap-4 rounded-panel bg-surface-muted p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void execute()
          }}
        >
          <h3 className="font-display text-2xl font-extrabold">{actionLabels[action]}</h3>
          {needsReason && (
            <label className={labelClassName}>
              Motivo
              <textarea
                className={`${fieldClassName} min-h-24 py-3`}
                name="reason"
                required
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setAction(undefined)}
            >
              Volver
            </Button>
            <Button
              variant={needsReason ? 'danger' : 'primary'}
              disabled={disabled || busy || (needsReason && !reason.trim())}
            >
              {busy ? 'Guardando...' : 'Confirmar acción'}
            </Button>
          </div>
        </form>
      )}

      {notice && (
        <p className={errorClassName} role="alert">
          {notice}
        </p>
      )}

      {canManage && (
        <details className="group rounded-panel bg-surface-muted" aria-label="Historial de cita">
          <summary className="flex min-h-12 cursor-pointer items-center justify-between rounded-panel px-4 font-semibold hover:bg-surface-strong">
            Historial
            <span className="text-sm font-normal text-ink-muted">
              {history.data ? `${history.data.length} cambios` : ''}
            </span>
          </summary>
          <div className="px-4 pb-4">
            {history.isPending && <p role="status">Cargando historial...</p>}
            {history.isError && (
              <p className={errorClassName} role="alert">
                No se pudo cargar el historial.{' '}
                <button className="font-bold underline" onClick={() => void history.refetch()}>
                  Reintentar historial
                </button>
              </p>
            )}
            <ol className="grid gap-3">
              {history.data?.map((event) => (
                <li className="rounded-control bg-surface p-3 text-sm" key={event.id}>
                  <strong>{eventLabel(event.action, event.after.status)}</strong>{' '}
                  <span className="text-ink-muted tabular-nums">
                    a las {agendaTime(event.occurredAt)}
                  </span>
                  {event.reason && <p className="mt-1">Motivo: {event.reason}</p>}
                  {event.before && (
                    <p className="mt-1 text-ink-soft">Antes: {describe(event.before)}</p>
                  )}
                  <p className="mt-1 text-ink-soft">
                    {event.before ? 'Después' : 'Quedó'}: {describe(event.after)}
                  </p>
                  {event.before && event.before.barberId !== event.after.barberId && (
                    <p className="mt-1 font-semibold">Se cambió el barbero asignado.</p>
                  )}
                  {event.before && event.before.serviceId !== event.after.serviceId && (
                    <p className="mt-1 font-semibold">Se cambió el servicio.</p>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </details>
      )}
    </section>
  )
}
