import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agendaTime, type Appointment, type Customer } from '../../core/agenda/Agenda'
import { timeRangeLabel } from '../../core/agenda/AgendaTimeline'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { cn } from '../styles/cn'
import { AppIcon } from './AppIcon'
import { CustomerPicker } from './CustomerPicker'
import { Button } from './Button'
import { errorClassName, fieldClassName, labelClassName } from '../styles/formStyles'

interface Props {
  appointment: Appointment | undefined
  date: string
  // Suggested barber and start time ("HH:MM") when the agenda's empty half hour was tapped.
  barberId?: string | undefined
  startTime?: string | undefined
  disabled: boolean
  onSaved: () => void
  onClose: () => void
}

export const AppointmentEditor = ({
  appointment,
  date: initialDate,
  barberId: initialBarberId,
  startTime,
  disabled,
  onSaved,
  onClose,
}: Props) => {
  const [customer, setCustomer] = useState<Customer>()
  const [date, setDate] = useState(initialDate)
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? '')
  const [barberId, setBarberId] = useState(appointment?.barberId ?? initialBarberId ?? 'any')
  const [reason, setReason] = useState('')
  const [picked, setSlot] = useState<AvailabilitySlot>()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const barbers = useQuery({
    queryKey: ['scheduling', 'barbers'],
    queryFn: schedulingApi.listBarbers,
  })
  const services = useQuery({
    queryKey: ['scheduling', 'services'],
    queryFn: schedulingApi.listServices,
  })
  // Times load as soon as service, barber and date are chosen.
  const slots = useQuery({
    queryKey: ['availability', appointment?.id, serviceId, barberId, date],
    enabled: Boolean(serviceId && date),
    queryFn: () =>
      appointment
        ? agendaApi.alternatives(appointment.id, serviceId, barberId, date)
        : schedulingApi.search({ serviceId, barberId, dateFrom: date, dateTo: date }),
  })
  // The tapped time comes preselected once its service shows it free that day.
  const suggestedTime = startTime && date === initialDate ? startTime : undefined
  const suggested = suggestedTime
    ? slots.data?.find((item) => agendaTime(item.startsAt) === suggestedTime)
    : undefined
  const slot = picked ?? suggested
  const step = appointment ? 1 : 2

  const save = async () => {
    if (disabled || busy || !slot || (!appointment && !customer)) return
    setBusy(true)
    setNotice('')
    try {
      const input = { barberId: slot.barberId, serviceId: slot.serviceId, startsAt: slot.startsAt }
      if (appointment) await agendaApi.reschedule(appointment, input, reason)
      else if (customer) await agendaApi.create({ ...input, customerId: customer.id })
      onSaved()
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? error.message)
          : 'No pudimos confirmar. Recarga la agenda antes de reintentar si la conexión falló.',
      )
      setSlot(undefined)
      await slots.refetch()
    } finally {
      setBusy(false)
    }
  }

  const slotGroups = slots.data
    ? [
        {
          label: 'Mañana',
          items: slots.data.filter((item) => agendaTime(item.startsAt) < '13:00'),
        },
        {
          label: 'Tarde',
          items: slots.data.filter((item) => agendaTime(item.startsAt) >= '13:00'),
        },
      ].filter((group) => group.items.length > 0)
    : []

  return (
    <section className="grid gap-7" aria-label={appointment ? 'Reprogramar cita' : 'Nueva cita'}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-3xl leading-none font-extrabold">
            {appointment ? 'Reprogramar cita' : 'Nueva cita'}
          </h2>
          {appointment && (
            <p className="mt-2 text-ink-soft">
              {appointment.customerName}. Horario actual: {timeRangeLabel(appointment)} con{' '}
              {appointment.barberName}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-11 shrink-0 px-0"
          aria-label="Cerrar editor"
          disabled={busy}
          onClick={onClose}
        >
          <AppIcon name="close" />
        </Button>
      </header>

      {!appointment && (
        <CustomerPicker selected={customer} onSelect={setCustomer} disabled={disabled || busy} />
      )}

      <section className="grid gap-4" aria-labelledby="schedule-step">
        <h3 id="schedule-step" className="font-display text-2xl font-extrabold">
          {step}. Servicio y horario
        </h3>
        {suggestedTime && !serviceId && (
          <p className="rounded-control bg-info-soft p-4 text-sm text-info-ink">
            Elegiste las {suggestedTime}. Elige el servicio para ver si ese horario está libre.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClassName}>
            Servicio
            <select
              className={fieldClassName}
              required
              value={serviceId}
              onChange={(event) => {
                setServiceId(event.target.value)
                setSlot(undefined)
              }}
            >
              <option value="">Elige un servicio</option>
              {services.data
                ?.filter((service) => service.active)
                .map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
            </select>
          </label>
          <label className={labelClassName}>
            Barbero
            <select
              className={fieldClassName}
              value={barberId}
              onChange={(event) => {
                setBarberId(event.target.value)
                setSlot(undefined)
              }}
            >
              <option value="any">Cualquiera disponible</option>
              {barbers.data?.map((barber) => (
                <option key={barber.id} value={barber.id}>
                  {barber.displayName}
                </option>
              ))}
            </select>
          </label>
          <label className={cn(labelClassName, 'sm:col-span-2')}>
            Fecha
            <input
              className={fieldClassName}
              type="date"
              required
              min={todayInBusinessTime()}
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setSlot(undefined)
              }}
            />
          </label>
        </div>

        {(barbers.isPending || services.isPending) && (
          <p className="text-sm text-ink-muted" role="status">
            Cargando servicios y barberos...
          </p>
        )}
        {(barbers.isError || services.isError) && (
          <p className={errorClassName} role="alert">
            No se pudo cargar el catálogo.{' '}
            <button
              className="font-bold underline"
              type="button"
              onClick={() => {
                void barbers.refetch()
                void services.refetch()
              }}
            >
              Reintentar catálogo
            </button>
          </p>
        )}
        {!serviceId && (
          <p className="rounded-control bg-surface-muted p-4 text-sm text-ink-soft">
            Elige un servicio para ver los horarios libres.
          </p>
        )}
        {serviceId && slots.isFetching && (
          <p className="text-sm text-ink-muted" role="status">
            Buscando horarios libres...
          </p>
        )}
        {serviceId && slots.isError && (
          <p className={errorClassName} role="alert">
            No se pudo consultar la disponibilidad.{' '}
            <button
              className="font-bold underline"
              type="button"
              onClick={() => void slots.refetch()}
            >
              Reintentar horarios
            </button>
          </p>
        )}
        {serviceId && slots.data?.length === 0 && (
          <p className="rounded-control bg-surface-muted p-4 text-sm text-ink-soft">
            No hay horarios libres ese día. Prueba con otra fecha o con otro barbero.
          </p>
        )}
        {suggestedTime && !picked && !suggested && Boolean(slots.data?.length) && (
          <p className="rounded-control bg-warning-soft p-4 text-sm text-warning-ink">
            Las {suggestedTime} no están libres para este servicio. Elige otro horario.
          </p>
        )}
        {slotGroups.length > 0 && (
          <fieldset className="grid gap-4">
            <legend className="sr-only">Elige un horario libre</legend>
            {slotGroups.map((group) => (
              <div key={group.label} className="grid gap-2">
                <p className="text-sm font-semibold text-ink-soft">{group.label}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((item) => {
                    const selected =
                      slot?.barberId === item.barberId && slot.startsAt === item.startsAt
                    return (
                      <button
                        key={`${item.barberId}|${item.startsAt}`}
                        className={cn(
                          'min-h-16 rounded-control border-2 px-3 py-2 text-left transition-colors duration-150',
                          selected
                            ? 'border-ink bg-ink text-on-ink'
                            : 'border-transparent bg-surface-muted hover:border-line-control',
                        )}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSlot(item)}
                      >
                        <strong className="block font-display text-2xl leading-none font-extrabold tabular-nums">
                          {agendaTime(item.startsAt)}
                        </strong>
                        <span className="mt-1 block truncate text-sm opacity-80">
                          {item.barberName}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </fieldset>
        )}
      </section>

      {appointment && (
        <label className={labelClassName}>
          Motivo del cambio
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

      {slot && (
        <div className="rounded-panel bg-surface-muted p-4">
          <p className="font-semibold">
            {timeRangeLabel(slot)} con {slot.barberName}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            Precio informado {centsToBolivianos(slot.priceCents)}, {slot.durationMinutes} min. Se
            cobra al terminar la atención.
          </p>
        </div>
      )}

      <Button
        size="lg"
        width="full"
        disabled={
          disabled ||
          busy ||
          !slot ||
          (!appointment && !customer) ||
          Boolean(appointment && !reason.trim())
        }
        onClick={() => void save()}
      >
        {busy ? 'Confirmando...' : appointment ? 'Guardar reprogramación' : 'Confirmar cita'}
      </Button>
      {notice && (
        <p className={errorClassName} role="alert">
          {notice}
        </p>
      )}
    </section>
  )
}
