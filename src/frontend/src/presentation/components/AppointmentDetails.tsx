import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  agendaActions,
  statusLabels,
  type AgendaAction,
  type Appointment,
  type AppointmentSnapshot,
} from '../../core/agenda/Agenda'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { agendaTime } from '../../core/agenda/Agenda'
import { salesApi } from '../../infrastructure/http/salesApi'

const actionLabels: Record<AgendaAction, string> = {
  cancel: 'Cancelar cita',
  'no-show': 'Marcar inasistencia',
  'check-in': 'Registrar llegada',
  start: 'Iniciar atención',
}
const describe = (snapshot: AppointmentSnapshot) =>
  `${snapshot.startsAt.slice(0, 10)} ${agendaTime(snapshot.startsAt)}–${agendaTime(snapshot.endsAt)} · ${statusLabels[snapshot.status]} · ${snapshot.durationMinutes} min · ${centsToBolivianos(snapshot.priceCents)}`
interface Props {
  appointment: Appointment
  canManage: boolean
  disabled: boolean
  onChanged: () => void
  onReschedule: () => void
  onClose: () => void
}
export const AppointmentDetails = ({
  appointment,
  canManage,
  disabled,
  onChanged,
  onReschedule,
  onClose,
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
  const needsReason = action === 'cancel' || action === 'no-show'
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
  return (
    <section className="appointment-editor master-panel" aria-label="Detalle de cita">
      <div className="page-heading">
        <h2>{appointment.customerName}</h2>
        <button disabled={busy} onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
      <p>
        {appointment.serviceName} · {appointment.barberName}
      </p>
      <p>
        {agendaTime(appointment.startsAt)}–{agendaTime(appointment.endsAt)} ·{' '}
        {statusLabels[appointment.status]}
      </p>
      {appointment.quotedPriceCents !== null && (
        <p>
          Precio informado: {centsToBolivianos(appointment.quotedPriceCents)} ·{' '}
          {appointment.quotedDurationMinutes} min. Sin cobro registrado por esta cita.
        </p>
      )}
      <div className="row-actions">
        {appointment.status === 'IN_SERVICE' && (
          <button
            disabled={disabled || busy}
            onClick={() => {
              setBusy(true)
              void salesApi
                .openAppointment(appointment.id)
                .then((opened) => window.location.assign(`/operations?operationId=${opened.id}`))
                .catch((error: unknown) =>
                  setNotice(
                    error instanceof ApiError
                      ? (error.problem.detail ?? error.message)
                      : 'No se pudo abrir la atención.',
                  ),
                )
                .finally(() => setBusy(false))
            }}
          >
            Abrir atención y cobro
          </button>
        )}
        {canManage && appointment.status === 'CONFIRMED' && (
          <button disabled={disabled || busy} onClick={onReschedule}>
            Reprogramar / reasignar
          </button>
        )}
        {agendaActions(appointment.status, canManage).map((item) => (
          <button
            key={item}
            disabled={disabled || busy}
            onClick={() => {
              setAction(item)
              setNotice('')
            }}
          >
            {actionLabels[item]}
          </button>
        ))}
      </div>
      {action && (
        <form
          className="compact-form"
          onSubmit={(event) => {
            event.preventDefault()
            void execute()
          }}
        >
          <h3>{actionLabels[action]}</h3>
          {needsReason && (
            <label>
              Motivo
              <textarea
                required
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <button
            className="primary-button"
            disabled={disabled || busy || (needsReason && !reason.trim())}
          >
            {busy ? 'Guardando…' : 'Confirmar acción'}
          </button>
        </form>
      )}
      {notice && <p role="alert">{notice}</p>}
      {canManage && (
        <section aria-label="Historial de cita">
          <h3>Historial</h3>
          {history.isPending && <p role="status">Cargando historial…</p>}
          {history.isError && (
            <p role="alert">
              No se pudo cargar el historial.{' '}
              <button onClick={() => void history.refetch()}>Reintentar historial</button>
            </p>
          )}
          <ol className="event-history">
            {history.data?.map((event) => (
              <li key={event.id}>
                <strong>
                  {event.action === 'CREATED'
                    ? 'Creación'
                    : event.action === 'RESCHEDULED'
                      ? 'Reprogramación'
                      : statusLabels[event.after.status]}
                </strong>{' '}
                · {agendaTime(event.occurredAt)}
                {event.reason && <p>Motivo: {event.reason}</p>}
                {event.before && <p>Antes: {describe(event.before)}</p>}
                <p>Después: {describe(event.after)}</p>
                {event.before?.barberId !== event.after.barberId && event.before && (
                  <p>
                    Barbero: {event.before.barberId} → {event.after.barberId}
                  </p>
                )}
                {event.before?.serviceId !== event.after.serviceId && event.before && (
                  <p>
                    Servicio: {event.before.serviceId} → {event.after.serviceId}
                  </p>
                )}
                <small>Actor: {event.actorId}</small>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  )
}
