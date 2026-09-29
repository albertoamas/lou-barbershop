import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agendaTime, type Appointment, type Customer } from '../../core/agenda/Agenda'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { ApiError } from '../../infrastructure/http/apiClient'
import { CustomerPicker } from './CustomerPicker'
import { Button } from './Button'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  noticeClassName,
} from '../styles/formStyles'

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
    <section className="grid gap-6" aria-label={appointment ? 'Reprogramar cita' : 'Nueva cita'}>
      <div className="flex items-start justify-between gap-4 border-b border-lou-fog pb-5">
        <div>
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
            Agenda interna
          </p>
          <h2 className="mt-1 font-display text-3xl leading-none font-bold">
            {appointment ? `Reprogramar · ${appointment.customerName}` : 'Nueva cita'}
          </h2>
        </div>
        <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>
          Cerrar editor
        </Button>
      </div>
      {!appointment && (
        <CustomerPicker selected={customer} onSelect={setCustomer} disabled={disabled || busy} />
      )}
      <div>
        <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
          {appointment ? 'Nueva condición' : 'Paso 2'}
        </p>
        <h3 className="mt-1 font-display text-2xl font-bold">Servicio y horario</h3>
      </div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={find}>
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
        <label className={labelClassName}>
          Fecha de la cita
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
        {(barbers.isPending || services.isPending) && (
          <p className="text-sm text-lou-graphite/60" role="status">
            Cargando catálogo…
          </p>
        )}
        {(barbers.isError || services.isError) && (
          <p className={`${errorClassName} sm:col-span-2`} role="alert">
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
        <Button
          className="sm:col-span-2"
          width="full"
          disabled={disabled || busy || !serviceId || barbers.isPending || services.isPending}
        >
          Buscar horarios
        </Button>
      </form>
      {search && slots.isFetching && (
        <p className="text-sm text-lou-graphite/60" role="status">
          Consultando disponibilidad…
        </p>
      )}
      {search && slots.isError && (
        <p className={errorClassName} role="alert">
          No se pudo consultar disponibilidad.{' '}
          <button className="font-bold underline" onClick={() => void slots.refetch()}>
            Reintentar horarios
          </button>
        </p>
      )}
      {search && slots.data?.length === 0 && (
        <p className="rounded-xl border border-dashed border-lou-steel p-4 text-sm text-lou-graphite/60">
          No hay horarios. Prueba otra fecha o barbero.
        </p>
      )}
      {searchMatches && slots.data && slots.data.length > 0 && (
        <fieldset className="grid gap-4">
          <legend className="text-sm font-bold">Elige un horario disponible</legend>
          {slotGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-[0.65rem] font-bold tracking-[0.16em] text-lou-graphite/45 uppercase">
                {group.label}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {group.items.map((item) => {
                  const selected =
                    slot?.barberId === item.barberId && slot.startsAt === item.startsAt
                  return (
                    <button
                      key={`${item.barberId}|${item.startsAt}`}
                      className={`rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-300 ease-lou ${
                        selected
                          ? 'border-lou-ink bg-lou-ink text-white shadow-lou-sm'
                          : 'border-lou-fog bg-white hover:border-lou-graphite/45 hover:shadow-lou-sm'
                      }`}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setSlot(item)}
                    >
                      <strong className="block font-display text-xl tabular-nums">
                        {agendaTime(item.startsAt)}
                      </strong>
                      <span
                        className={`block truncate text-xs ${selected ? 'text-white/70' : 'text-lou-graphite/55'}`}
                      >
                        {item.barberName}
                      </span>
                      <span
                        className={`mt-1 block text-[0.65rem] ${selected ? 'text-white/70' : 'text-lou-graphite/45'}`}
                      >
                        {item.durationMinutes} min · {centsToBolivianos(item.priceCents)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </fieldset>
      )}
      {appointment && (
        <label className={labelClassName}>
          Motivo de reprogramación
          <textarea
            className={`${fieldClassName} min-h-24 py-3`}
            required
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      )}
      {slot && (
        <p className={noticeClassName}>
          Confirmar {agendaTime(slot.startsAt)}–{agendaTime(slot.endsAt)} con {slot.barberName}.
          Precio informado: {centsToBolivianos(slot.priceCents)}. No registra un cobro.
        </p>
      )}
      <Button
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
        {busy ? 'Confirmando…' : appointment ? 'Guardar reprogramación' : 'Confirmar cita'}
      </Button>
      {notice && (
        <p className={errorClassName} role="alert">
          {notice}
        </p>
      )}
    </section>
  )
}
