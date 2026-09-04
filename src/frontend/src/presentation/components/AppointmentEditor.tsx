import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agendaTime, type Appointment, type Customer } from '../../core/agenda/Agenda'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { CustomerPicker } from './CustomerPicker'

interface Props {
  appointment: Appointment | undefined
  date: string
  disabled: boolean
  onSaved: () => void
  onClose: () => void
}
export const AppointmentEditor = ({
  appointment,
  date: initialDate,
  disabled,
  onSaved,
  onClose,
}: Props) => {
  const [customer, setCustomer] = useState<Customer>()
  const [date, setDate] = useState(initialDate)
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? '')
  const [barberId, setBarberId] = useState(appointment?.barberId ?? 'any')
  const [reason, setReason] = useState('')
  const [search, setSearch] = useState<{ serviceId: string; barberId: string; date: string }>()
  const [slot, setSlot] = useState<AvailabilitySlot>()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const searchMatches =
    search?.serviceId === serviceId && search?.barberId === barberId && search?.date === date
  const barbers = useQuery({
    queryKey: ['scheduling', 'barbers'],
    queryFn: schedulingApi.listBarbers,
  })
  const services = useQuery({
    queryKey: ['scheduling', 'services'],
    queryFn: schedulingApi.listServices,
  })
  const slots = useQuery({
    queryKey: ['availability', appointment?.id, search],
    enabled: Boolean(search),
    queryFn: () => {
      if (!search) return Promise.resolve([])
      return appointment
        ? agendaApi.alternatives(appointment.id, search.serviceId, search.barberId, search.date)
        : schedulingApi.search({ ...search, dateFrom: search.date, dateTo: search.date })
    },
  })
  const find = (event: FormEvent) => {
    event.preventDefault()
    setSlot(undefined)
    if (search?.serviceId === serviceId && search.barberId === barberId && search.date === date)
      void slots.refetch()
    setSearch({ serviceId, barberId, date })
  }
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
  return (
    <section
      className="appointment-editor master-panel"
      aria-label={appointment ? 'Reprogramar cita' : 'Nueva cita'}
    >
      <div className="page-heading">
        <h2>{appointment ? `Reprogramar · ${appointment.customerName}` : 'Nueva cita'}</h2>
        <button disabled={busy} onClick={onClose}>
          Cerrar editor
        </button>
      </div>
      {!appointment && (
        <CustomerPicker selected={customer} onSelect={setCustomer} disabled={disabled || busy} />
      )}
      <h3>{appointment ? 'Nueva condición' : '2. Servicio y horario'}</h3>
      <form className="compact-form" onSubmit={find}>
        <label>
          Servicio
          <select
            required
            value={serviceId}
            onChange={(event) => {
              setServiceId(event.target.value)
              setSlot(undefined)
            }}
          >
            <option value="">Selecciona servicio</option>
            {services.data
              ?.filter((service) => service.active)
              .map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Barbero
          <select
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
        <label>
          Fecha de la cita
          <input
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
        {(barbers.isPending || services.isPending) && <p role="status">Cargando catálogo…</p>}
        {(barbers.isError || services.isError) && (
          <p role="alert">
            No se pudo cargar el catálogo.{' '}
            <button
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
        <button
          disabled={disabled || busy || !serviceId || barbers.isPending || services.isPending}
        >
          Buscar horarios
        </button>
      </form>
      {search && slots.isFetching && <p role="status">Consultando disponibilidad…</p>}
      {search && slots.isError && (
        <p role="alert">
          No se pudo consultar disponibilidad.{' '}
          <button onClick={() => void slots.refetch()}>Reintentar horarios</button>
        </p>
      )}
      {search && slots.data?.length === 0 && <p>No hay horarios. Prueba otra fecha o barbero.</p>}
      {searchMatches && slots.data && slots.data.length > 0 && (
        <label>
          Horario disponible
          <select
            value={slot ? `${slot.barberId}|${slot.startsAt}` : ''}
            onChange={(event) =>
              setSlot(
                slots.data.find(
                  (item) => `${item.barberId}|${item.startsAt}` === event.target.value,
                ),
              )
            }
          >
            <option value="">Selecciona un horario</option>
            {slots.data.map((item) => (
              <option
                key={`${item.barberId}|${item.startsAt}`}
                value={`${item.barberId}|${item.startsAt}`}
              >
                {agendaTime(item.startsAt)} · {item.barberName} · {item.durationMinutes} min ·{' '}
                {centsToBolivianos(item.priceCents)}
              </option>
            ))}
          </select>
        </label>
      )}
      {appointment && (
        <label>
          Motivo de reprogramación
          <textarea
            required
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      )}
      {slot && (
        <p className="owner-rule">
          Confirmar {agendaTime(slot.startsAt)}–{agendaTime(slot.endsAt)} con {slot.barberName}.
          Precio informado: {centsToBolivianos(slot.priceCents)}. No registra un cobro.
        </p>
      )}
      <button
        className="primary-button"
        disabled={
          disabled ||
          busy ||
          !slot ||
          (!appointment && !customer) ||
          Boolean(appointment && !reason.trim())
        }
        onClick={() => void save()}
      >
        {busy ? 'Confirmando…' : appointment ? 'Guardar reprogramación' : 'Confirmar cita'}
      </button>
      {notice && <p role="alert">{notice}</p>}
    </section>
  )
}
