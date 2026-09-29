import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  operationStatus,
  operationStep,
  paymentDifference,
  paymentDraftFor,
  paymentMatches,
  type Operation,
} from '../../core/sales/Sales'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { authApi } from '../../infrastructure/http/authApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
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

const sectionTitleClassName = 'font-display text-2xl font-bold sm:text-3xl'
const fieldsetClassName = 'grid gap-3 rounded-2xl border border-lou-fog bg-lou-paper p-4 sm:p-5'
const legendClassName = 'px-2 font-display text-xl font-bold'
const stages = ['Cliente', 'Consumo', 'Ajustes', 'Pago', 'Confirmación']

const Workflow = ({ current }: { current: number }) => (
  <ol className="grid grid-cols-5 gap-1" aria-label={`Etapa ${current} de 5`}>
    {stages.map((label, index) => {
      const step = index + 1
      const complete = step < current
      const active = step === current
      return (
        <li className="min-w-0" key={label} aria-current={active ? 'step' : undefined}>
          <div className="flex items-center">
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors duration-300',
                complete && 'border-lou-ink bg-lou-ink text-white',
                active && 'border-lou-ink bg-white text-lou-ink ring-4 ring-lou-fog',
                !complete && !active && 'border-lou-steel bg-white text-lou-graphite/45',
              )}
            >
              {complete ? <AppIcon name="check" size={14} /> : step}
            </span>
            {step < stages.length && (
              <span className={cn('h-px w-full bg-lou-fog', complete && 'bg-lou-ink')} />
            )}
          </div>
          <span
            className={cn(
              'mt-2 hidden truncate text-[0.65rem] font-bold sm:block',
              active ? 'text-lou-ink' : 'text-lou-graphite/45',
            )}
          >
            {label}
          </span>
        </li>
      )
    })}
  </ol>
)

export const OperationsPage = () => {
  const location = useLocation()
  const opened = (location.state as { opened?: Operation } | null)?.opened
  const [date, setDate] = useState(todayInBusinessTime())
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [barberId, setBarberId] = useState(opened?.barberId ?? '')
  const [operation, setOperation] = useState<Operation | undefined>(opened)
  const [activeStep, setActiveStep] = useState(operationStep(opened))
  const [selectedServices, setSelectedServices] = useState<string[]>(
    opened?.items
      .filter((item) => item.type === 'SERVICE' && item.serviceId)
      .map((item) => item.serviceId!) ?? [],
  )
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>(
    Object.fromEntries(
      opened?.items
        .filter((item) => item.type === 'PRODUCT' && item.productId)
        .map((item) => [item.productId!, item.quantity]) ?? [],
    ),
  )
  const [discount, setDiscount] = useState(opened?.discountCents ?? 0)
  const [courtesy, setCourtesy] = useState(Boolean(opened?.courtesyCents))
  const [reason, setReason] = useState(opened?.adjustmentReason ?? '')
  const [cash, setCash] = useState(0)
  const [qr, setQr] = useState(0)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID())
  const [showReversal, setShowReversal] = useState(false)
  const [reversalReason, setReversalReason] = useState('')
  const online = useConnectivity() === 'online'

  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const canAdjust = canManage
  const canReverse = Boolean(session.data?.roles.includes('OWNER'))
  const isBarber = Boolean(session.data?.roles.includes('BARBER'))
  const ownBarber = useQuery({
    queryKey: ['operations', 'own-barber', session.data?.id],
    queryFn: salesApi.ownBarber,
    enabled: Boolean(session.data && isBarber && !canManage),
  })
  const daily = useQuery({ queryKey: ['operations', date], queryFn: () => salesApi.daily(date) })
  const customers = useQuery({
    queryKey: ['customers', search],
    queryFn: () => agendaApi.customers(search),
  })
  const barbers = useQuery({
    queryKey: ['scheduling', 'barbers'],
    queryFn: schedulingApi.listBarbers,
  })
  const services = useQuery({
    queryKey: ['scheduling', 'services'],
    queryFn: schedulingApi.listServices,
  })
  const inventory = useQuery({ queryKey: ['inventory'], queryFn: inventoryApi.inventory })

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('operationId')
    if (id)
      void salesApi
        .read(id)
        .then((value) => {
          setOperation(value)
          setActiveStep(operationStep(value))
        })
        .catch(() => setNotice('No se pudo cargar la atención.'))
  }, [])

  const applyOperation = (value: Operation) => {
    const isAnotherOperation = value.id !== operation?.id
    setOperation(value)
    if (isAnotherOperation) {
      const paymentDraft = paymentDraftFor(operation?.id, value.id, { cash, qr })
      setPaymentKey(crypto.randomUUID())
      setCash(paymentDraft.cash)
      setQr(paymentDraft.qr)
    }
    setSelectedServices(
      value.items
        .filter((item) => item.type === 'SERVICE' && item.serviceId)
        .map((item) => item.serviceId!),
    )
    setSelectedProducts(
      Object.fromEntries(
        value.items
          .filter((item) => item.type === 'PRODUCT' && item.productId)
          .map((item) => [item.productId!, item.quantity]),
      ),
    )
    setDiscount(value.discountCents)
    setCourtesy(value.courtesyCents > 0)
    setReason(value.adjustmentReason ?? '')
    if (value.status !== 'DRAFT') setActiveStep(operationStep(value))
  }

  const run = async (action: () => Promise<Operation>) => {
    setBusy(true)
    setNotice('')
    try {
      const value = await action()
      applyOperation(value)
      await daily.refetch()
      return value
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }

  const saveConsumption = async () => {
    if (!operation || selectedServices.length === 0) return
    setNotice('')
    let current = operation
    const persistedServices = current.items
      .filter((item) => item.type === 'SERVICE' && item.serviceId)
      .map((item) => item.serviceId!)
      .sort()
    const requestedServices = [...selectedServices].sort()
    if (persistedServices.join('|') !== requestedServices.join('|')) {
      const withServices = await run(() => salesApi.services(current, selectedServices))
      if (!withServices) return
      current = withServices
    }
    const products = Object.entries(selectedProducts)
      .filter(([, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({ productId, quantity }))
      .sort((left, right) => left.productId.localeCompare(right.productId))
    const persistedProducts = current.items
      .filter((item) => item.type === 'PRODUCT' && item.productId)
      .map((item) => ({ productId: item.productId!, quantity: item.quantity }))
      .sort((left, right) => left.productId.localeCompare(right.productId))
    if (JSON.stringify(persistedProducts) !== JSON.stringify(products)) {
      const saved = await run(() => salesApi.products(current, products))
      if (!saved) return
    }
    setActiveStep(3)
  }

  const preparePayment = async () => {
    if (!operation) return
    let current = operation
    if (canAdjust && (discount > 0 || courtesy)) {
      if (!reason.trim()) return
      const adjusted = await run(() => salesApi.adjust(current, discount, courtesy, reason.trim()))
      if (!adjusted) return
      current = adjusted
    }
    await run(() => salesApi.ready(current))
  }

  const selectOperation = (value: Operation) => {
    applyOperation(value)
    setActiveStep(operationStep(value))
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const startAnother = () => {
    setOperation(undefined)
    setActiveStep(1)
    setCustomerId('')
    setSelectedServices([])
    setSelectedProducts({})
    setDiscount(0)
    setCourtesy(false)
    setReason('')
    setCash(0)
    setQr(0)
    setNotice('')
  }

  const difference = paymentDifference(operation?.totalCents ?? 0, cash, qr)
  const effectiveBarberId = canManage ? barberId : (ownBarber.data?.barberId ?? '')
  const ownBarberName = barbers.data?.find((item) => item.id === effectiveBarberId)?.displayName
  const payments = [
    ...(cash > 0 ? [{ method: 'CASH' as const, amountCents: cash }] : []),
    ...(qr > 0 ? [{ method: 'QR' as const, amountCents: qr }] : []),
  ]

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b border-lou-fog pb-7">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
          Operación diaria
        </p>
        <h1 className="m-0 max-w-4xl font-display text-5xl leading-[0.9] font-bold sm:text-6xl">
          Atender y cobrar
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
          Registra lo que realmente se realizó y confirma cómo pagó el cliente.
        </p>
      </header>

      {!online && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Sin conexión: la información puede consultarse, pero ninguna atención o pago puede
          modificarse.
        </p>
      )}
      {notice && (
        <p className={`mt-5 ${errorClassName}`} role="alert">
          {notice}
        </p>
      )}

      <section className={`mt-5 ${panelClassName}`} aria-label="Progreso de atención">
        <Workflow current={activeStep} />
      </section>

      {!operation && (
        <section className={`mt-5 ${panelClassName}`} aria-label="Abrir llegada directa">
          <div className="mb-5">
            <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
              Etapa 1 de 5 · Cliente
            </p>
            <h2 className={sectionTitleClassName}>Abrir llegada directa</h2>
            <p className="mt-2 text-sm text-lou-graphite/60">
              Si viene desde una cita, ábrela desde Agenda. Usa este formulario sólo para quien
              llegó sin reservar.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <label className={labelClassName}>
              Buscar cliente
              <input
                className={fieldClassName}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o teléfono"
              />
            </label>
            <label className={labelClassName}>
              Cliente
              <select
                className={fieldClassName}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Selecciona una persona</option>
                {customers.data?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName} · {customer.phone}
                  </option>
                ))}
              </select>
            </label>
            {session.isPending ? (
              <p
                className="rounded-xl border border-lou-fog bg-lou-paper p-4 text-sm lg:col-span-2"
                role="status"
              >
                Cargando permisos…
              </p>
            ) : canManage ? (
              <label className={`${labelClassName} lg:col-span-2`}>
                Barbero que atenderá
                <select
                  className={fieldClassName}
                  value={barberId}
                  onChange={(event) => setBarberId(event.target.value)}
                >
                  <option value="">Selecciona un barbero</option>
                  {barbers.data?.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.displayName}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="rounded-xl border border-lou-fog bg-lou-paper p-4 lg:col-span-2">
                <span className="text-[0.65rem] font-bold tracking-wider text-lou-graphite/45 uppercase">
                  Barbero efectivo
                </span>
                <p className="mt-1 font-bold">
                  {ownBarber.isPending
                    ? 'Identificando tu perfil…'
                    : (ownBarberName ?? 'Tu perfil de barbero')}
                </p>
                <p className="text-xs text-lou-graphite/55">
                  La atención quedará asignada únicamente a tu perfil.
                </p>
              </div>
            )}
            <details className="rounded-2xl border border-lou-fog bg-lou-paper p-4 lg:col-span-2">
              <summary className="cursor-pointer font-display text-xl font-bold">
                El cliente no está registrado
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className={labelClassName}>
                  Nombre
                  <input
                    className={fieldClassName}
                    value={newCustomerName}
                    onChange={(event) => setNewCustomerName(event.target.value)}
                  />
                </label>
                <label className={labelClassName}>
                  Teléfono
                  <input
                    className={fieldClassName}
                    type="tel"
                    value={newCustomerPhone}
                    onChange={(event) => setNewCustomerPhone(event.target.value)}
                  />
                </label>
                <Button
                  type="button"
                  disabled={!online || busy || !newCustomerName.trim() || !newCustomerPhone.trim()}
                  onClick={() => {
                    setBusy(true)
                    setNotice('')
                    void agendaApi
                      .saveCustomer({
                        displayName: newCustomerName.trim(),
                        phone: newCustomerPhone.trim(),
                        notes: null,
                      })
                      .then(async ({ customer }) => {
                        setCustomerId(customer.id)
                        setSearch(customer.displayName)
                        setNewCustomerName('')
                        setNewCustomerPhone('')
                        await customers.refetch()
                      })
                      .catch((error: unknown) =>
                        setNotice(
                          error instanceof Error ? error.message : 'No se pudo crear el cliente.',
                        ),
                      )
                      .finally(() => setBusy(false))
                  }}
                >
                  Crear y seleccionar
                </Button>
              </div>
            </details>
            <Button
              className="lg:col-span-2"
              width="full"
              disabled={!online || busy || !customerId || !effectiveBarberId}
              onClick={() =>
                void run(() => salesApi.openWalkIn(customerId, effectiveBarberId)).then(
                  (value) => value && setActiveStep(2),
                )
              }
            >
              {busy ? 'Abriendo atención…' : 'Continuar al consumo'}
            </Button>
          </div>
        </section>
      )}

      {operation && (
        <section className="mt-5" aria-label="Atención actual">
          <div className="sticky top-0 z-20 flex flex-col gap-3 rounded-2xl border border-lou-fog bg-white/95 p-4 shadow-lou-sm backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-bold tracking-[0.16em] text-lou-graphite/45 uppercase">
                {operation.origin === 'WALK_IN' ? 'Llegada directa' : 'Desde cita'} ·{' '}
                {operationStatus(operation.status)}
              </p>
              <h2 className="truncate font-display text-2xl font-bold">{operation.customerName}</h2>
              <p className="text-xs text-lou-graphite/55">Atiende {operation.barberName}</p>
            </div>
            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <div className="text-right">
                <span className="block text-[0.65rem] font-bold tracking-wider text-lou-graphite/45 uppercase">
                  Total
                </span>
                <strong className="font-display text-4xl leading-none tabular-nums">
                  {centsToBolivianos(operation.totalCents)}
                </strong>
              </div>
              <Button variant="ghost" disabled={busy} onClick={startAnother}>
                Otra atención
              </Button>
            </div>
          </div>

          {operation.status === 'DRAFT' && activeStep === 2 && (
            <div className={`mt-4 ${panelClassName}`}>
              <div className="mb-5">
                <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                  Etapa 2 de 5 · Consumo
                </p>
                <h3 className={sectionTitleClassName}>¿Qué se realizó y vendió?</h3>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <fieldset className={fieldsetClassName}>
                  <legend className={legendClassName}>Servicios realizados</legend>
                  {services.data
                    ?.filter((service) => service.active)
                    .map((service) => (
                      <label
                        className="flex min-h-12 items-center gap-3 rounded-xl border border-lou-fog bg-white px-4 py-3 text-sm font-semibold transition-colors has-checked:border-lou-ink has-checked:bg-lou-ink has-checked:text-white"
                        key={service.id}
                      >
                        <input
                          className="size-4 accent-lou-ink"
                          type="checkbox"
                          checked={selectedServices.includes(service.id)}
                          onChange={(event) =>
                            setSelectedServices(
                              event.target.checked
                                ? [...selectedServices, service.id]
                                : selectedServices.filter((id) => id !== service.id),
                            )
                          }
                        />
                        <span className="flex-1">{service.name}</span>
                        <span>{centsToBolivianos(service.defaultPriceCents)}</span>
                      </label>
                    ))}
                </fieldset>
                <fieldset className={fieldsetClassName}>
                  <legend className={legendClassName}>Productos vendidos</legend>
                  {inventory.data
                    ?.filter((item) => item.active)
                    .map((item) => (
                      <label
                        className="grid items-center gap-2 rounded-xl border border-lou-fog bg-white p-3 text-sm font-semibold sm:grid-cols-[1fr_6rem]"
                        key={item.productId}
                      >
                        <span>
                          {item.name}
                          <small className="mt-1 block font-normal text-lou-graphite/55">
                            {centsToBolivianos(item.salePriceCents)} · disponibles {item.quantity}
                          </small>
                        </span>
                        <input
                          className={fieldClassName}
                          aria-label={`Cantidad de ${item.name}`}
                          type="number"
                          min="0"
                          max={Math.max(0, item.quantity)}
                          value={selectedProducts[item.productId] ?? 0}
                          onChange={(event) =>
                            setSelectedProducts((rows) => ({
                              ...rows,
                              [item.productId]: Number(event.target.value),
                            }))
                          }
                        />
                      </label>
                    ))}
                </fieldset>
              </div>
              <Button
                className="mt-5"
                width="full"
                disabled={!online || busy || selectedServices.length === 0}
                onClick={() => void saveConsumption()}
              >
                {busy ? 'Guardando consumo…' : 'Guardar y continuar a ajustes'}
              </Button>
            </div>
          )}

          {operation.status === 'DRAFT' && activeStep === 3 && (
            <div className={`mt-4 ${panelClassName}`}>
              <div className="mb-5">
                <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                  Etapa 3 de 5 · Ajustes
                </p>
                <h3 className={sectionTitleClassName}>
                  {canAdjust ? 'Revisa descuentos o cortesías' : 'Revisa el total'}
                </h3>
                <p className="mt-2 text-sm text-lou-graphite/60">
                  Los ajustes no cambian los servicios realizados. El servidor volverá a calcular el
                  total.
                </p>
              </div>
              {canAdjust ? (
                <section
                  className="grid gap-4 rounded-2xl border border-amber-900/15 bg-amber-50 p-4 sm:grid-cols-2"
                  aria-label="Ajuste autorizado"
                >
                  <label className={labelClassName}>
                    Descuento (Bs)
                    <input
                      className={fieldClassName}
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount ? discount / 100 : ''}
                      onChange={(event) =>
                        setDiscount(Math.round(Number(event.target.value) * 100))
                      }
                      placeholder="0.00"
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-900/15 bg-white px-4 text-sm font-bold">
                    <input
                      className="size-4 accent-lou-ink"
                      type="checkbox"
                      checked={courtesy}
                      onChange={(event) => setCourtesy(event.target.checked)}
                    />
                    Cortesía total
                  </label>
                  <label className={`${labelClassName} sm:col-span-2`}>
                    Motivo del ajuste
                    <input
                      className={fieldClassName}
                      maxLength={300}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Obligatorio si hay descuento o cortesía"
                    />
                  </label>
                </section>
              ) : (
                <p className="rounded-2xl border border-lou-fog bg-lou-paper p-5 text-sm">
                  Tu rol puede confirmar el consumo y cobrarlo. Los descuentos y cortesías requieren
                  autorización de dueño o administración.
                </p>
              )}
              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" disabled={busy} onClick={() => setActiveStep(2)}>
                  Volver al consumo
                </Button>
                <Button
                  disabled={
                    !online ||
                    busy ||
                    Boolean(canAdjust && (discount > 0 || courtesy) && !reason.trim())
                  }
                  onClick={() => void preparePayment()}
                >
                  {busy ? 'Preparando cobro…' : 'Confirmar total y pasar al pago'}
                </Button>
              </div>
            </div>
          )}

          {operation.status === 'READY_TO_PAY' && (
            <div
              className="mt-4 grid gap-5 rounded-2xl border border-lou-ink bg-lou-ink p-5 text-white sm:p-7"
              aria-label="Registrar pago"
            >
              <div>
                <p className="text-[0.65rem] font-bold tracking-[0.18em] text-white/55 uppercase">
                  Etapa 4 de 5 · Pago
                </p>
                <h3 className="font-display text-3xl font-bold">¿Cómo pagó?</h3>
              </div>
              {operation.totalCents > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                      variant="ghost"
                      onClick={() => {
                        setCash(operation.totalCents)
                        setQr(0)
                      }}
                    >
                      Todo efectivo
                    </Button>
                    <Button
                      className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                      variant="ghost"
                      onClick={() => {
                        setCash(0)
                        setQr(operation.totalCents)
                      }}
                    >
                      Todo QR
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-1.5 text-xs font-bold">
                      Efectivo (Bs)
                      <input
                        className={`${fieldClassName} text-lou-ink`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={cash ? cash / 100 : ''}
                        onChange={(event) => setCash(Math.round(Number(event.target.value) * 100))}
                        placeholder="0.00"
                      />
                    </label>
                    <label className="grid gap-1.5 text-xs font-bold">
                      QR (Bs)
                      <input
                        className={`${fieldClassName} text-lou-ink`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={qr ? qr / 100 : ''}
                        onChange={(event) => setQr(Math.round(Number(event.target.value) * 100))}
                        placeholder="0.00"
                      />
                    </label>
                  </div>
                  <p
                    className={cn(
                      'rounded-xl p-4 text-center text-sm font-bold',
                      difference === 0
                        ? 'bg-emerald-400/20 text-emerald-100'
                        : 'bg-white/10 text-white',
                    )}
                  >
                    {difference === 0
                      ? 'Monto exacto · listo para cobrar'
                      : difference > 0
                        ? `Faltan ${centsToBolivianos(difference)}`
                        : `El pago excede por ${centsToBolivianos(Math.abs(difference))}`}
                  </p>
                </>
              ) : (
                <p className="rounded-xl bg-white/10 p-4 text-sm">
                  Cortesía total: no se registrará entrada de efectivo ni QR.
                </p>
              )}
              <Button
                className="border-white bg-white text-lou-ink hover:bg-lou-fog"
                width="full"
                disabled={!online || busy || !paymentMatches(operation.totalCents, cash, qr)}
                onClick={() => void run(() => salesApi.pay(operation, payments, paymentKey))}
              >
                {busy
                  ? 'Confirmando una sola vez…'
                  : operation.totalCents === 0
                    ? 'Cerrar cortesía'
                    : `Confirmar cobro de ${centsToBolivianos(operation.totalCents)}`}
              </Button>
              <p className="text-center text-xs text-white/55">
                El cobro se envía con protección contra doble registro.
              </p>
            </div>
          )}

          {operation.status === 'PAID' && (
            <article
              className="mt-4 grid gap-4 rounded-2xl border border-emerald-800/20 bg-emerald-50 p-5 text-sm text-emerald-950 sm:p-7"
              aria-label="Cobro confirmado"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-full bg-emerald-700 text-white">
                  <AppIcon name="check" />
                </span>
                <div>
                  <p className="text-[0.65rem] font-bold tracking-[0.18em] text-emerald-900/55 uppercase">
                    Etapa 5 de 5 · Confirmación
                  </p>
                  <h3 className="font-display text-3xl font-bold">Cobro confirmado</h3>
                </div>
              </div>
              <div className="grid gap-3 rounded-xl bg-white/70 p-4 sm:grid-cols-2">
                <p>
                  <span className="block text-xs text-emerald-900/55">Detalle</span>
                  {operation.items
                    .map(
                      (item) =>
                        `${item.description}${item.quantity > 1 ? ` × ${item.quantity}` : ''}`,
                    )
                    .join(', ')}
                </p>
                <p>
                  <span className="block text-xs text-emerald-900/55">Pagos</span>
                  {operation.payments.length
                    ? operation.payments
                        .map(
                          (payment) =>
                            `${payment.method === 'CASH' ? 'Efectivo' : 'QR'} ${centsToBolivianos(payment.amountCents)}`,
                        )
                        .join(' + ')
                    : 'Sin pago por cortesía'}
                </p>
                <p>
                  <span className="block text-xs text-emerald-900/55">Subtotal</span>
                  {centsToBolivianos(operation.subtotalCents)}
                </p>
                <p>
                  <span className="block text-xs text-emerald-900/55">Total final</span>
                  <strong>{centsToBolivianos(operation.totalCents)}</strong>
                </p>
              </div>
              {canReverse && (
                <div className="border-t border-emerald-900/15 pt-4">
                  {!showReversal ? (
                    <Button
                      variant="danger"
                      disabled={!online || busy}
                      onClick={() => {
                        setShowReversal(true)
                        setReversalReason('')
                      }}
                    >
                      Revertir operación
                    </Button>
                  ) : (
                    <form
                      className="grid gap-3 rounded-xl border border-lou-danger/20 bg-white p-4 text-lou-ink"
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (!reversalReason.trim()) return
                        setBusy(true)
                        setNotice('')
                        void salesApi
                          .reverse(operation, reversalReason.trim())
                          .then(async () => {
                            applyOperation(await salesApi.read(operation.id))
                            setShowReversal(false)
                            setReversalReason('')
                            await daily.refetch()
                          })
                          .catch((error: unknown) =>
                            setNotice(
                              error instanceof Error ? error.message : 'No se pudo revertir.',
                            ),
                          )
                          .finally(() => setBusy(false))
                      }}
                    >
                      <div>
                        <h4 className="font-display text-xl font-bold">Confirma el reverso</h4>
                        <p className="mt-1 text-xs text-lou-graphite/60">
                          No borra el cobro: registra una corrección económica y conserva el
                          historial.
                        </p>
                      </div>
                      <label className={labelClassName}>
                        Motivo obligatorio
                        <textarea
                          className={`${fieldClassName} min-h-24 py-3`}
                          required
                          maxLength={300}
                          value={reversalReason}
                          onChange={(event) => setReversalReason(event.target.value)}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="danger"
                          disabled={!online || busy || !reversalReason.trim()}
                        >
                          {busy ? 'Revirtiendo…' : 'Confirmar reverso'}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => setShowReversal(false)}
                        >
                          Conservar operación
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </article>
          )}

          {operation.status === 'REVERSED' && (
            <article
              className="mt-4 grid gap-2 rounded-2xl border border-lou-danger/20 bg-red-50 p-5 text-sm text-lou-danger"
              aria-label="Operación revertida"
            >
              <h3 className="font-display text-2xl font-bold">Operación revertida</h3>
              <p>{operation.reversalReason}</p>
              <p>
                El cobro salió de la caja interna y se corrigieron inventario y comisión sin borrar
                el historial.
              </p>
            </article>
          )}
        </section>
      )}

      <section className={`mt-6 ${panelClassName}`} aria-label="Resumen del día">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
              Caja interna
            </p>
            <h2 className={sectionTitleClassName}>
              {canManage ? 'Resumen del día' : 'Mi jornada'}
            </h2>
          </div>
          <label className={labelClassName}>
            Fecha
            <input
              className={fieldClassName}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Pagadas', String(daily.data?.paidCount ?? 0)],
            ['Total', centsToBolivianos(daily.data?.totalCents ?? 0)],
            ['Efectivo', centsToBolivianos(daily.data?.cashCents ?? 0)],
            ['QR', centsToBolivianos(daily.data?.qrCents ?? 0)],
          ].map(([label, value]) => (
            <div className="rounded-xl bg-lou-paper p-4" key={label}>
              <dt className="text-[0.65rem] font-bold tracking-wider text-lou-graphite/45 uppercase">
                {label}
              </dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 grid gap-2">
          {daily.isPending && <p role="status">Cargando operaciones…</p>}
          {daily.isError && (
            <p className={errorClassName} role="alert">
              No se pudo cargar el resumen.{' '}
              <button className="font-bold underline" onClick={() => void daily.refetch()}>
                Reintentar
              </button>
            </p>
          )}
          {daily.data?.operations.length === 0 && (
            <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
              Sin operaciones para esta fecha.
            </p>
          )}
          {daily.data?.operations.map((item) => (
            <button
              className={cn(
                'grid w-full gap-1 rounded-xl border bg-white p-4 text-left shadow-sm transition-[translate,box-shadow,border-color] duration-300 ease-lou hover:-translate-y-0.5 hover:shadow-lou-lg sm:grid-cols-[1fr_auto]',
                operation?.id === item.id
                  ? 'border-lou-ink'
                  : 'border-lou-fog hover:border-lou-ink',
              )}
              key={item.id}
              onClick={() => selectOperation(item)}
            >
              <strong>{item.customerName}</strong>
              <span className="font-display text-xl font-bold tabular-nums sm:row-span-2">
                {centsToBolivianos(item.totalCents)}
              </span>
              <span className="text-xs text-lou-graphite/60">
                {item.barberName} · {operationStatus(item.status)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
