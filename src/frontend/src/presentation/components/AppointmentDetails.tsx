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
import type { Operation } from '../../core/sales/Sales'
import { Button } from './Button'
import { errorClassName, fieldClassName, labelClassName } from '../styles/formStyles'

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
    <section className="grid gap-6" aria-label="Detalle de cita">
      <div className="flex items-start justify-between gap-4 border-b border-lou-fog pb-5">
        <div>
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
            Detalle de cita
          </p>
          <h2 className="mt-1 font-display text-3xl leading-none font-bold">
            {appointment.customerName}
          </h2>
        </div>
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cerrar detalle
        </Button>
      </div>
      <div className="grid gap-3 rounded-2xl border border-lou-fog bg-lou-paper p-5 sm:grid-cols-2">
        <div>
          <span className="text-[0.65rem] font-bold tracking-wider text-lou-graphite/45 uppercase">
            Servicio
          </span>
          <p className="mt-1 font-bold">{appointment.serviceName}</p>
          <p className="text-sm text-lou-graphite/60">con {appointment.barberName}</p>
        </div>
        <div>
          <span className="text-[0.65rem] font-bold tracking-wider text-lou-graphite/45 uppercase">
            Horario y estado
          </span>
          <p className="mt-1 font-display text-xl font-bold tabular-nums">
            {agendaTime(appointment.startsAt)}–{agendaTime(appointment.endsAt)}
          </p>
          <p className="text-sm text-lou-graphite/60">{statusLabels[appointment.status]}</p>
        </div>
      </div>
      {appointment.quotedPriceCents !== null && (
        <p className="rounded-xl border border-sky-800/15 bg-sky-50 p-4 text-sm text-sky-950">
          Precio informado: {centsToBolivianos(appointment.quotedPriceCents)} ·{' '}
          {appointment.quotedDurationMinutes} min. Sin cobro registrado por esta cita.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {appointment.status === 'IN_SERVICE' && (
          <Button
            disabled={disabled || busy}
            onClick={() => {
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
            }}
          >
            Abrir atención y cobro
          </Button>
        )}
        {canManage && appointment.status === 'CONFIRMED' && (
          <Button variant="secondary" disabled={disabled || busy} onClick={onReschedule}>
            Reprogramar / reasignar
          </Button>
        )}
        {agendaActions(appointment.status, canManage).map((item) => (
          <Button
            variant={item === 'cancel' || item === 'no-show' ? 'danger' : 'secondary'}
            key={item}
            disabled={disabled || busy}
            onClick={() => {
              setAction(item)
              setNotice('')
            }}
          >
            {actionLabels[item]}
          </Button>
        ))}
      </div>
      {action && (
        <form
          className="grid gap-4 rounded-2xl border border-lou-fog bg-lou-paper p-4"
          onSubmit={(event) => {
            event.preventDefault()
            void execute()
          }}
        >
          <h3 className="font-display text-2xl font-bold">{actionLabels[action]}</h3>
          {needsReason && (
            <label className={labelClassName}>
              Motivo
              <textarea
                className={`${fieldClassName} min-h-24 py-3`}
                required
                maxLength={300}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
          )}
          <Button
            variant={action === 'cancel' || action === 'no-show' ? 'danger' : 'primary'}
            disabled={disabled || busy || (needsReason && !reason.trim())}
          >
            {busy ? 'Guardando…' : 'Confirmar acción'}
          </Button>
        </form>
      )}
      {notice && (
        <p className={errorClassName} role="alert">
          {notice}
        </p>
      )}
      {canManage && (
        <section className="border-t border-lou-fog pt-6" aria-label="Historial de cita">
          <h3 className="font-display text-2xl font-bold">Historial</h3>
          {history.isPending && <p role="status">Cargando historial…</p>}
          {history.isError && (
            <p className={errorClassName} role="alert">
              No se pudo cargar el historial.{' '}
              <button className="font-bold underline" onClick={() => void history.refetch()}>
                Reintentar historial
              </button>
            </p>
          )}
          <ol className="mt-4 grid gap-3 border-l border-lou-steel/60 pl-5">
            {history.data?.map((event) => (
              <li
                className="relative rounded-xl border border-lou-fog bg-white p-4 text-sm shadow-sm before:absolute before:top-5 before:-left-[1.58rem] before:size-2 before:rounded-full before:bg-lou-ink"
                key={event.id}
              >
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
                <small className="text-lou-graphite/45">Actor: {event.actorId}</small>
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  )
}
