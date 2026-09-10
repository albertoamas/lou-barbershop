import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { agendaApi } from '../../infrastructure/http/agendaApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { authApi } from '../../infrastructure/http/authApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  operationStatus,
  paymentDraftFor,
  paymentMatches,
  type Operation,
} from '../../core/sales/Sales'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { useConnectivity } from '../hooks/useConnectivity'
import { useLocation } from 'react-router-dom'
import { Button } from '../components/Button'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  panelClassName,
} from '../styles/formStyles'

const sectionTitleClassName = 'font-display text-2xl font-bold sm:text-3xl'
const fieldsetClassName = 'grid gap-3 rounded-2xl border border-lou-fog bg-lou-paper p-4 sm:p-5'
const legendClassName = 'px-2 font-display text-xl font-bold'

export const OperationsPage = () => {
  const location = useLocation()
  const opened = (location.state as { opened?: Operation } | null)?.opened
  const [date, setDate] = useState(todayInBusinessTime())
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [barberId, setBarberId] = useState('')
  const [operation, setOperation] = useState<Operation | undefined>(opened)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedProducts, setSelectedProducts] = useState<Record<string, number>>({})
  const [discount, setDiscount] = useState(0)
  const [courtesy, setCourtesy] = useState(false)
  const [reason, setReason] = useState('')
  const [cash, setCash] = useState(0)
  const [qr, setQr] = useState(0)
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID())
  const [showReversal, setShowReversal] = useState(false)
  const [reversalReason, setReversalReason] = useState('')
  const online = useConnectivity() === 'online'
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('operationId')
    if (id)
      void salesApi
        .read(id)
        .then(setOperation)
        .catch(() => setNotice('No se pudo cargar la atención.'))
  }, [])
  const daily = useQuery({ queryKey: ['operations', date], queryFn: () => salesApi.daily(date) })
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const canAdjust = session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN')
  const canReverse = session.data?.roles.includes('OWNER')
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
  const run = async (action: () => Promise<Operation>) => {
    setBusy(true)
    setNotice('')
    try {
      const value = await action()
      setOperation(value)
      if (value.id !== operation?.id) {
        const paymentDraft = paymentDraftFor(operation?.id, value.id, { cash, qr })
        setPaymentKey(crypto.randomUUID())
        setDiscount(0)
        setCourtesy(false)
        setReason('')
        setCash(paymentDraft.cash)
        setQr(paymentDraft.qr)
      }
      setSelectedServices(
        value.items.filter((x) => x.type === 'SERVICE' && x.serviceId).map((x) => x.serviceId!),
      )
      setSelectedProducts(
        Object.fromEntries(
          value.items
            .filter((x) => x.type === 'PRODUCT' && x.productId)
            .map((x) => [x.productId!, x.quantity]),
        ),
      )
      await daily.refetch()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar.')
    } finally {
      setBusy(false)
    }
  }
  const payments = [
    ...(cash > 0 ? [{ method: 'CASH' as const, amountCents: cash }] : []),
    ...(qr > 0 ? [{ method: 'QR' as const, amountCents: qr }] : []),
  ]
  return (
    <main className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="border-b border-lou-fog pb-8">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Atención y cobro
          </p>
          <h1 className="m-0 max-w-4xl font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
            Lo que realmente ocurrió.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-lou-graphite/65">
            La cita orienta; servicios, ajustes y pago se confirman aquí.
          </p>
        </div>
      </div>
      {!online && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Sin conexión: no se pueden modificar atenciones ni registrar pagos.
        </p>
      )}
      {notice && (
        <p className={`mt-5 ${errorClassName}`} role="alert">
          {notice}
        </p>
      )}
      <section className={`mt-6 ${panelClassName}`}>
        <div className="mb-5">
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
            Sin cita previa
          </p>
          <h2 className={sectionTitleClassName}>Llegada directa</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <label className={labelClassName}>
            Buscar cliente
            <input
              className={fieldClassName}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <label className={labelClassName}>
            Cliente
            <select
              className={fieldClassName}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Selecciona</option>
              {customers.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.displayName} · {x.phone}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClassName}>
            Barbero efectivo
            <select
              className={fieldClassName}
              value={barberId}
              onChange={(e) => setBarberId(e.target.value)}
            >
              <option value="">Selecciona</option>
              {barbers.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.displayName}
                </option>
              ))}
            </select>
          </label>
          <fieldset className={`${fieldsetClassName} lg:col-span-3`}>
            <legend className={legendClassName}>O crea un cliente</legend>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className={labelClassName}>
                Nombre
                <input
                  className={fieldClassName}
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                />
              </label>
              <label className={labelClassName}>
                Teléfono
                <input
                  className={fieldClassName}
                  type="tel"
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
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
                Crear y seleccionar cliente
              </Button>
            </div>
          </fieldset>
          <Button
            className="lg:col-span-3"
            width="full"
            disabled={!online || busy || !customerId || !barberId}
            onClick={() => void run(() => salesApi.openWalkIn(customerId, barberId))}
          >
            Abrir atención directa
          </Button>
        </div>
      </section>
      {operation && (
        <section className={`mt-6 ${panelClassName}`} aria-label="Atención actual">
          <div className="flex flex-col justify-between gap-4 border-b border-lou-fog pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                Atención actual
              </p>
              <h2 className={sectionTitleClassName}>{operation.customerName}</h2>
              <p className="mt-1 text-sm text-lou-graphite/60">
                {operation.barberName} ·{' '}
                {operation.origin === 'WALK_IN' ? 'Llegada directa' : 'Desde cita'} ·{' '}
                {operationStatus(operation.status)}
              </p>
            </div>
            <strong className="font-display text-4xl tabular-nums">
              {centsToBolivianos(operation.totalCents)}
            </strong>
          </div>
          {operation.status === 'DRAFT' && (
            <div className="mt-6 grid gap-6">
              <fieldset className={fieldsetClassName}>
                <legend className={legendClassName}>Servicios realizados</legend>
                {services.data
                  ?.filter((x) => x.active)
                  .map((x) => (
                    <label
                      className="flex min-h-11 items-center gap-3 rounded-xl border border-lou-fog bg-white px-4 py-3 text-sm font-semibold transition-colors has-checked:border-lou-ink has-checked:bg-lou-ink has-checked:text-white"
                      key={x.id}
                    >
                      <input
                        className="size-4 accent-lou-ink"
                        type="checkbox"
                        checked={selectedServices.includes(x.id)}
                        onChange={(e) =>
                          setSelectedServices(
                            e.target.checked
                              ? [...selectedServices, x.id]
                              : selectedServices.filter((id) => id !== x.id),
                          )
                        }
                      />
                      {x.name} · {centsToBolivianos(x.defaultPriceCents)}
                    </label>
                  ))}
              </fieldset>
              <Button
                variant="secondary"
                disabled={!online || busy || selectedServices.length === 0}
                onClick={() => void run(() => salesApi.services(operation, selectedServices))}
              >
                Confirmar servicios reales
              </Button>
              <fieldset className={fieldsetClassName}>
                <legend className={legendClassName}>Productos vendidos</legend>
                {inventory.data
                  ?.filter((x) => x.active)
                  .map((x) => (
                    <label
                      className="grid items-center gap-2 rounded-xl border border-lou-fog bg-white p-3 text-sm font-semibold sm:grid-cols-[1fr_6rem]"
                      key={x.productId}
                    >
                      <span>
                        {x.name} · disponibles {x.quantity} · {centsToBolivianos(x.salePriceCents)}
                      </span>
                      <input
                        className={fieldClassName}
                        aria-label={`Cantidad de ${x.name}`}
                        type="number"
                        min="0"
                        max={Math.max(0, x.quantity)}
                        value={selectedProducts[x.productId] ?? 0}
                        onChange={(event) =>
                          setSelectedProducts((rows) => ({
                            ...rows,
                            [x.productId]: Number(event.target.value),
                          }))
                        }
                      />
                    </label>
                  ))}
              </fieldset>
              <Button
                variant="secondary"
                disabled={!online || busy}
                onClick={() =>
                  void run(() =>
                    salesApi.products(
                      operation,
                      Object.entries(selectedProducts)
                        .filter(([, quantity]) => quantity > 0)
                        .map(([productId, quantity]) => ({ productId, quantity })),
                    ),
                  )
                }
              >
                Confirmar productos vendidos
              </Button>
              {canAdjust && (
                <section
                  className="grid gap-4 rounded-2xl border border-amber-900/15 bg-amber-50 p-4 sm:grid-cols-2"
                  aria-label="Ajuste autorizado"
                >
                  <div className="sm:col-span-2">
                    <p className="text-[0.65rem] font-bold tracking-[0.18em] text-amber-900/55 uppercase">
                      Solo dueño o administración
                    </p>
                    <h3 className="font-display text-xl font-bold text-amber-950">
                      Descuento o cortesía
                    </h3>
                  </div>
                  <label className={labelClassName}>
                    Descuento en centavos
                    <input
                      className={fieldClassName}
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </label>
                  <label className="flex min-h-11 items-center gap-3 rounded-xl border border-amber-900/15 bg-white px-4 text-sm font-bold">
                    <input
                      className="size-4 accent-lou-ink"
                      type="checkbox"
                      checked={courtesy}
                      onChange={(e) => setCourtesy(e.target.checked)}
                    />{' '}
                    Cortesía total
                  </label>
                  <label className={`${labelClassName} sm:col-span-2`}>
                    Motivo
                    <input
                      className={fieldClassName}
                      maxLength={300}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </label>
                  <Button
                    className="sm:col-span-2"
                    width="full"
                    variant="secondary"
                    disabled={!online || busy || !reason}
                    onClick={() =>
                      void run(() => salesApi.adjust(operation, discount, courtesy, reason))
                    }
                  >
                    Aplicar ajuste
                  </Button>
                </section>
              )}
              <Button
                width="full"
                disabled={!online || busy || operation.items.length === 0}
                onClick={() => void run(() => salesApi.ready(operation))}
              >
                Lista para cobrar
              </Button>
            </div>
          )}
          {operation.status === 'READY_TO_PAY' && (
            <div className="mt-6 grid gap-4 rounded-2xl border border-lou-ink bg-lou-ink p-5 text-white sm:grid-cols-2 sm:p-6">
              <p className="sm:col-span-2">
                Total exacto: <strong>{centsToBolivianos(operation.totalCents)}</strong>
              </p>
              {operation.totalCents > 0 && (
                <>
                  <label className="grid gap-1.5 text-xs font-bold">
                    Efectivo en centavos
                    <input
                      className={`${fieldClassName} text-lou-ink`}
                      type="number"
                      min="0"
                      value={cash}
                      onChange={(e) => setCash(Number(e.target.value))}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-bold">
                    QR en centavos
                    <input
                      className={`${fieldClassName} text-lou-ink`}
                      type="number"
                      min="0"
                      value={qr}
                      onChange={(e) => setQr(Number(e.target.value))}
                    />
                  </label>
                </>
              )}
              <Button
                className="border-white bg-white text-lou-ink hover:bg-lou-fog sm:col-span-2"
                width="full"
                disabled={!online || busy || !paymentMatches(operation.totalCents, cash, qr)}
                onClick={() => void run(() => salesApi.pay(operation, payments, paymentKey))}
              >
                {operation.totalCents === 0 ? 'Cerrar cortesía' : 'Confirmar cobro'}
              </Button>
            </div>
          )}
          {operation.status === 'PAID' && (
            <article
              className="mt-6 grid gap-3 rounded-2xl border border-emerald-800/20 bg-emerald-50 p-5 text-sm text-emerald-950"
              aria-label="Resumen interno"
            >
              <div>
                <p className="text-[0.65rem] font-bold tracking-[0.18em] text-emerald-900/55 uppercase">
                  Cobro confirmado
                </p>
                <h3 className="font-display text-2xl font-bold">Operación cerrada</h3>
              </div>
              <p>
                Detalle:{' '}
                {operation.items
                  .map((x) => `${x.description}${x.quantity > 1 ? ` × ${x.quantity}` : ''}`)
                  .join(', ')}
              </p>
              <p>
                Subtotal {centsToBolivianos(operation.subtotalCents)} · descuento{' '}
                {centsToBolivianos(operation.discountCents)} · cortesía{' '}
                {centsToBolivianos(operation.courtesyCents)}
              </p>
              <p>
                Pagos:{' '}
                {operation.payments.length
                  ? operation.payments
                      .map((x) => `${x.method}: ${centsToBolivianos(x.amountCents)}`)
                      .join(' + ')
                  : 'Sin pago por cortesía'}
              </p>
              {canReverse && (
                <div className="mt-2 border-t border-emerald-900/15 pt-4">
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
                            setOperation(await salesApi.read(operation.id))
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
                          No borra el historial: registra la corrección económica.
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
              className="mt-6 grid gap-2 rounded-2xl border border-lou-danger/20 bg-red-50 p-5 text-sm text-lou-danger"
              aria-label="Operación revertida"
            >
              <h3 className="font-display text-2xl font-bold">Operación revertida</h3>
              <p>{operation.reversalReason}</p>
              <p>
                Los cobros quedaron fuera de caja interna; la comisión e inventario se corrigieron
                sin borrar historia.
              </p>
            </article>
          )}
        </section>
      )}
      <section className={`mt-6 ${panelClassName}`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
              Caja interna
            </p>
            <h2 className={sectionTitleClassName}>Resumen del día</h2>
          </div>
          <label className={labelClassName}>
            Fecha
            <input
              className={fieldClassName}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
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
          {daily.data?.operations.length === 0 && (
            <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
              Sin operaciones para esta fecha.
            </p>
          )}
          {daily.data?.operations.map((x) => (
            <button
              className="grid w-full gap-1 rounded-xl border border-lou-fog bg-white p-4 text-left shadow-sm transition-[translate,box-shadow,border-color] duration-300 ease-lou hover:-translate-y-0.5 hover:border-lou-ink hover:shadow-lou-lg sm:grid-cols-[1fr_auto]"
              key={x.id}
              onClick={() => setOperation(x)}
            >
              <strong>{x.customerName}</strong>
              <span className="font-display text-xl font-bold tabular-nums sm:row-span-2">
                {centsToBolivianos(x.totalCents)}
              </span>
              <span className="text-xs text-lou-graphite/60">
                {x.barberName} · {operationStatus(x.status)}
              </span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
