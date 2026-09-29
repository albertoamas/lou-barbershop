import { useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, m } from 'motion/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { agendaTime } from '../../core/agenda/Agenda'
import {
  appointmentStatusLabel,
  managementTokenFromHash,
  managementTokenFromInput,
  type PublicBookingConfirmation,
} from '../../core/public-booking/PublicBooking'
import { todayInBusinessTime, type AvailabilitySlot } from '../../core/scheduling/Scheduling'
import { ApiError } from '../../infrastructure/http/apiClient'
import { publicBookingApi } from '../../infrastructure/http/publicBookingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { buttonStyles } from '../components/buttonStyles'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { AppointmentSummary } from './PublicBookingPage'

const fieldClassName =
  'min-h-12 w-full rounded-xl border border-lou-steel/60 bg-white px-4 text-base shadow-sm outline-none transition-[border-color,box-shadow] focus:border-lou-ink focus:ring-3 focus:ring-lou-ink/10'
const labelClassName = 'grid gap-2 text-sm font-bold text-lou-ink'

export const PublicManageBookingPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const token = managementTokenFromHash(location.hash)
  const [editing, setEditing] = useState(false)
  const [serviceId, setServiceId] = useState('')
  const [barberId, setBarberId] = useState('any')
  const [date, setDate] = useState(todayInBusinessTime())
  const [search, setSearch] = useState<{ serviceId: string; barberId: string; date: string }>()
  const [slot, setSlot] = useState<AvailabilitySlot>()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const connectivity = useConnectivity()
  const client = useQueryClient()

  const appointment = useQuery({
    queryKey: ['public-booking', 'manage', token],
    queryFn: () => publicBookingApi.read(token),
    enabled: Boolean(token),
    retry: false,
    networkMode: 'always',
  })
  const catalog = useQuery({
    queryKey: ['public-booking', 'catalog'],
    queryFn: publicBookingApi.catalog,
    enabled: editing,
    networkMode: 'always',
  })
  const slots = useQuery({
    queryKey: ['public-booking', 'manage-availability', search],
    queryFn: () =>
      search
        ? publicBookingApi.availability(search.serviceId, search.barberId, search.date)
        : Promise.resolve([]),
    enabled: Boolean(search),
    retry: false,
    networkMode: 'always',
  })

  const find = (event: FormEvent) => {
    event.preventDefault()
    setSlot(undefined)
    setSearch({ serviceId, barberId, date })
  }

  const openManagementLink = (input: string) => {
    const nextToken = managementTokenFromInput(input)
    if (!nextToken) return false
    setNotice('')
    void navigate(`/mi-cita#${nextToken}`, { replace: true })
    return true
  }

  const reschedule = async () => {
    if (!appointment.data || !slot || connectivity !== 'online') return
    setBusy(true)
    setNotice('')
    try {
      const changed: PublicBookingConfirmation = await publicBookingApi.reschedule(
        token,
        appointment.data,
        slot,
      )
      void navigate(changed.managementPath, { replace: true })
      client.setQueryData(
        ['public-booking', 'manage', changed.managementToken],
        changed.appointment,
      )
      setEditing(false)
      setSlot(undefined)
      setSearch(undefined)
      setNotice('Cita reprogramada. Tu enlace privado fue renovado; guarda esta página.')
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? error.message)
          : 'No pudimos cambiar la cita.',
      )
      setSlot(undefined)
      await slots.refetch()
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!appointment.data || connectivity !== 'online') return
    setBusy(true)
    setNotice('')
    try {
      const cancelled = await publicBookingApi.cancel(token, appointment.data)
      client.setQueryData(['public-booking', 'manage', token], cancelled)
      setNotice('La cita fue cancelada. Ese horario volvió a quedar disponible.')
      void navigate('/mi-cita', { replace: true })
    } catch (error) {
      setNotice(
        error instanceof ApiError
          ? (error.problem.detail ?? error.message)
          : 'No pudimos cancelar la cita.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (!token) return <ManagementAccess notice={notice} onOpen={openManagementLink} />
  if (appointment.isError) return <ManagementAccess invalidLink onOpen={openManagementLink} />

  return (
    <main className="bg-lou-paper px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto w-full max-w-5xl">
        <header className="grid items-end gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
              Gestión de reserva
            </p>
            <h1 className="m-0 max-w-3xl font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
              Tu cita, bajo control.
            </h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-lou-graphite/60 lg:pb-1">
            Consulta los detalles y cambia el horario sólo si lo necesitas. Tu enlace permanece
            privado.
          </p>
        </header>

        {appointment.isPending && (
          <section
            className="mt-8 rounded-2xl border border-lou-fog bg-white p-8 shadow-lou-sm"
            role="status"
          >
            <span className="inline-flex items-center gap-3 font-semibold text-lou-graphite/65">
              <span className="size-3 animate-pulse rounded-full bg-lou-ink" />
              Cargando tu reserva…
            </span>
          </section>
        )}

        {appointment.data && (
          <m.section
            className="mt-8 rounded-2xl border border-lou-fog bg-white p-5 shadow-lou-md sm:p-8"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-lou-ink px-3 py-1.5 text-xs font-bold text-white">
                <AppIcon name="check" size={15} />
                {appointmentStatusLabel[appointment.data.status]}
              </p>
              <p className="text-xs font-semibold text-lou-graphite/45">
                Enlace privado de gestión
              </p>
            </div>
            <AppointmentSummary appointment={appointment.data} />

            {appointment.data.status === 'CONFIRMED' && !editing && (
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Button
                  disabled={connectivity !== 'online' || busy}
                  onClick={() => {
                    setEditing(true)
                    setServiceId(appointment.data.serviceId)
                    setBarberId(appointment.data.barberId)
                    setDate(appointment.data.startsAt.slice(0, 10))
                  }}
                >
                  <AppIcon name="calendar" size={18} />
                  Cambiar horario
                </Button>
                <Button
                  variant="danger"
                  disabled={connectivity !== 'online' || busy}
                  onClick={() => setConfirmingCancel(true)}
                >
                  <AppIcon name="close" size={18} />
                  Cancelar cita
                </Button>
              </div>
            )}

            <AnimatePresence initial={false}>
              {editing && (
                <m.div
                  className="overflow-hidden"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.28 }}
                >
                  <div className="mt-7 border-t border-lou-fog pt-7">
                    <h2 className="m-0 font-display text-4xl font-bold">Nuevo horario</h2>
                    <p className="mt-2 text-sm leading-6 text-lou-graphite/60">
                      Tu cita actual se conserva hasta que confirmes una alternativa.
                    </p>
                    <form
                      className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_0.8fr_auto] lg:items-end"
                      onSubmit={find}
                    >
                      <label className={labelClassName}>
                        Servicio
                        <select
                          className={fieldClassName}
                          required
                          value={serviceId}
                          onChange={(event) => setServiceId(event.target.value)}
                        >
                          {catalog.data?.services.map((service) => (
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
                          onChange={(event) => setBarberId(event.target.value)}
                        >
                          <option value="any">Cualquiera</option>
                          {catalog.data?.barbers.map((barber) => (
                            <option key={barber.id} value={barber.id}>
                              {barber.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className={labelClassName}>
                        Día
                        <input
                          className={fieldClassName}
                          type="date"
                          min={todayInBusinessTime()}
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                        />
                      </label>
                      <Button variant="secondary">
                        <AppIcon name="clock" size={18} />
                        Buscar
                      </Button>
                    </form>

                    {slots.isFetching && (
                      <p className="mt-5" role="status">
                        Buscando horarios…
                      </p>
                    )}
                    {slots.isError && (
                      <p
                        className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-lou-danger"
                        role="alert"
                      >
                        No pudimos consultar los horarios. Revisa la conexión y vuelve a buscar.
                      </p>
                    )}
                    {search && !slots.isFetching && slots.data?.length === 0 && (
                      <p className="mt-5 rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/60">
                        No hay horarios ese día. Prueba otra fecha o barbero.
                      </p>
                    )}
                    {slots.data && slots.data.length > 0 && (
                      <ManageSlotChoices
                        items={slots.data}
                        selectedSlot={slot}
                        onSelect={setSlot}
                      />
                    )}
                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
                      <Button
                        disabled={!slot || connectivity !== 'online' || busy}
                        onClick={() => void reschedule()}
                      >
                        <AppIcon name="check" size={18} />
                        {busy ? 'Guardando…' : 'Confirmar nuevo horario'}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => {
                          setEditing(false)
                          setSlot(undefined)
                          setSearch(undefined)
                        }}
                      >
                        Conservar cita actual
                      </Button>
                    </div>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </m.section>
        )}

        {connectivity === 'offline' && (
          <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900" role="status">
            Sin conexión no podemos consultar ni cambiar el enlace privado.
          </p>
        )}
        {notice && (
          <p
            className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
            role="status"
          >
            {notice}
          </p>
        )}
        <p className="mt-8 text-center text-sm">
          <Link className="font-bold hover:underline" to="/reservar" viewTransition>
            Hacer otra reserva
          </Link>
        </p>
      </div>

      {confirmingCancel && appointment.data && (
        <ConfirmDialog
          busy={busy}
          title={`¿Cancelar la cita de ${appointment.data.customerName}?`}
          confirmLabel="Sí, cancelar cita"
          onCancel={() => setConfirmingCancel(false)}
          onConfirm={() => {
            void cancel().finally(() => setConfirmingCancel(false))
          }}
        >
          El horario volverá a quedar disponible. Esta acción quedará registrada y no se puede
          deshacer desde el enlace público.
        </ConfirmDialog>
      )}
    </main>
  )
}

const ManageSlotChoices = ({
  items,
  selectedSlot,
  onSelect,
}: {
  items: AvailabilitySlot[]
  selectedSlot: AvailabilitySlot | undefined
  onSelect: (slot: AvailabilitySlot) => void
}) => {
  const [period, setPeriod] = useState<'morning' | 'afternoon'>('morning')
  const uniqueSlots = Array.from(
    new Map(items.map((item) => [agendaTime(item.startsAt), item])).values(),
  )
  const morningSlots = uniqueSlots.filter((item) => bookingHour(item.startsAt) < 13)
  const afternoonSlots = uniqueSlots.filter((item) => bookingHour(item.startsAt) >= 15)
  const activePeriod = period === 'morning' && morningSlots.length === 0 ? 'afternoon' : period
  const visibleSlots = activePeriod === 'morning' ? morningSlots : afternoonSlots

  return (
    <div className="mt-5">
      <div
        className="relative grid grid-cols-2 rounded-xl bg-lou-fog/70 p-1"
        role="tablist"
        aria-label="Periodo del nuevo horario"
      >
        <m.span
          className="pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-lg bg-white shadow-sm"
          aria-hidden="true"
          animate={{ x: activePeriod === 'morning' ? '0%' : '100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
        />
        <PeriodButton
          label="Mañana"
          count={morningSlots.length}
          selected={activePeriod === 'morning'}
          disabled={morningSlots.length === 0}
          onClick={() => setPeriod('morning')}
        />
        <PeriodButton
          label="Tarde"
          count={afternoonSlots.length}
          selected={activePeriod === 'afternoon'}
          disabled={afternoonSlots.length === 0}
          onClick={() => setPeriod('afternoon')}
        />
      </div>
      <div
        className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
        role="radiogroup"
        aria-label={`Horarios de ${activePeriod === 'morning' ? 'la mañana' : 'la tarde'}`}
      >
        {visibleSlots.map((item) => {
          const selected =
            selectedSlot?.barberId === item.barberId && selectedSlot.startsAt === item.startsAt
          return (
            <button
              className={cn(
                'grid min-h-20 rounded-xl border border-lou-fog p-3 text-left transition-[translate,border-color,background-color,color,box-shadow] duration-300 ease-lou hover:-translate-y-0.5 hover:border-lou-steel hover:shadow-lou-sm',
                selected && 'border-lou-ink bg-lou-ink text-white shadow-lou-md',
              )}
              type="button"
              role="radio"
              aria-checked={selected}
              key={`${item.barberId}-${item.startsAt}`}
              onClick={() => onSelect(item)}
            >
              <strong className="font-display text-2xl">{agendaTime(item.startsAt)}</strong>
              <span className="text-xs font-bold opacity-65">{item.barberName}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

const PeriodButton = ({
  label,
  count,
  selected,
  disabled,
  onClick,
}: {
  label: string
  count: number
  selected: boolean
  disabled: boolean
  onClick: () => void
}) => (
  <button
    className={cn(
      'relative z-10 min-h-10 rounded-lg px-3 text-sm font-bold transition-colors duration-300',
      selected ? 'text-lou-ink' : 'text-lou-graphite/55',
      disabled && 'cursor-not-allowed opacity-40',
    )}
    type="button"
    role="tab"
    aria-selected={selected}
    disabled={disabled}
    onClick={onClick}
  >
    {label} <span className="ml-1 opacity-50">{count}</span>
  </button>
)

const bookingHour = (startsAt: string) =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/La_Paz',
      hour: '2-digit',
      hour12: false,
    }).format(new Date(startsAt)),
  )

const ManagementAccess = ({
  invalidLink = false,
  notice,
  onOpen,
}: {
  invalidLink?: boolean
  notice?: string
  onOpen: (input: string) => boolean
}) => {
  const [input, setInput] = useState('')
  const [validation, setValidation] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!onOpen(input)) setValidation('Pega el enlace completo que recibiste al reservar.')
  }

  return (
    <main className="bg-lou-paper px-4 py-10 sm:px-6 lg:py-16">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-14">
        <section>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Tu reserva
          </p>
          <h1 className="m-0 max-w-3xl font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
            Gestiona tu cita.
          </h1>
          <p className="mt-5 max-w-xl leading-7 text-lou-graphite/65">
            Abre el enlace privado que guardaste al reservar. Por seguridad no buscamos citas por
            nombre ni teléfono.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3 lg:max-w-2xl">
            {[
              ['01', 'Busca el enlace', 'Está en la confirmación de tu reserva.'],
              ['02', 'Pégalo aquí', 'Aceptamos el enlace completo o su código.'],
              ['03', 'Gestiona', 'Consulta, cambia o cancela con seguridad.'],
            ].map(([number, title, description]) => (
              <div className="border-t border-lou-steel/60 pt-3" key={number}>
                <span className="font-display text-xl font-bold text-lou-graphite/35">
                  {number}
                </span>
                <strong className="mt-1 block text-sm">{title}</strong>
                <small className="mt-1 block leading-5 text-lou-graphite/55">{description}</small>
              </div>
            ))}
          </div>
        </section>

        <m.form
          className="rounded-2xl bg-lou-ink p-5 text-white shadow-lou-lg sm:p-7"
          onSubmit={submit}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="grid size-12 place-items-center rounded-full bg-white text-lou-ink">
            <AppIcon name="calendar" size={23} />
          </span>
          <h2 className="mt-5 font-display text-4xl font-bold">Abrir mi cita</h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            El código permanece en tu navegador y se usa sólo para consultar esta reserva.
          </p>
          <label className="mt-6 grid gap-2 text-sm font-bold">
            Enlace privado
            <input
              className="min-h-12 w-full rounded-xl border border-white/20 bg-white px-4 text-base text-lou-ink outline-none transition-[border-color,box-shadow] focus:border-white focus:ring-3 focus:ring-white/20"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://…/mi-cita#…"
              value={input}
              onChange={(event) => {
                setInput(event.target.value)
                setValidation('')
              }}
            />
          </label>
          {(validation || invalidLink) && (
            <p className="mt-3 rounded-xl bg-white/10 p-3 text-sm text-white" role="alert">
              {validation ||
                'Ese enlace no es válido, ya venció o la cita dejó de estar disponible.'}
            </p>
          )}
          {notice && (
            <p className="mt-3 rounded-xl bg-emerald-700/35 p-3 text-sm text-white" role="status">
              {notice}
            </p>
          )}
          <Button className="mt-5" variant="secondary" width="full" type="submit">
            Abrir mi cita
            <AppIcon name="arrow-right" size={18} />
          </Button>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/45">
            ¿No conservas el enlace? Contacta a la barbería para recibir ayuda.
          </p>
        </m.form>
      </div>
      <p className="mx-auto mt-10 max-w-5xl text-center text-sm">
        <Link
          className={cn(buttonStyles({ variant: 'ghost' }), 'w-fit')}
          to="/reservar"
          viewTransition
        >
          Hacer una nueva reserva
        </Link>
      </p>
    </main>
  )
}
