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
    <main className="content operations-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Atención y cobro · Fase 7</p>
          <h1>Lo que realmente ocurrió.</h1>
          <p>La cita orienta; servicios, ajustes y pago se confirman aquí.</p>
        </div>
      </div>
      {!online && (
        <p role="status" className="conflict-notice">
          Sin conexión: no se pueden modificar atenciones ni registrar pagos.
        </p>
      )}
      {notice && <p role="alert">{notice}</p>}
      <section className="master-panel">
        <h2>Llegada directa</h2>
        <div className="compact-form">
          <label>
            Buscar cliente
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label>
            Cliente
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Selecciona</option>
              {customers.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.displayName} · {x.phone}
                </option>
              ))}
            </select>
          </label>
          <label>
            Barbero efectivo
            <select value={barberId} onChange={(e) => setBarberId(e.target.value)}>
              <option value="">Selecciona</option>
              {barbers.data?.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.displayName}
                </option>
              ))}
            </select>
          </label>
          <fieldset>
            <legend>O crea un cliente</legend>
            <label>
              Nombre
              <input value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
            </label>
            <label>
              Teléfono
              <input
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </label>
            <button
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
            </button>
          </fieldset>
          <button
            disabled={!online || busy || !customerId || !barberId}
            onClick={() => void run(() => salesApi.openWalkIn(customerId, barberId))}
          >
            Abrir atención directa
          </button>
        </div>
      </section>
      {operation && (
        <section className="master-panel operation-workspace" aria-label="Atención actual">
          <div className="page-heading">
            <div>
              <h2>{operation.customerName}</h2>
              <p>
                {operation.barberName} ·{' '}
                {operation.origin === 'WALK_IN' ? 'Llegada directa' : 'Desde cita'} ·{' '}
                {operationStatus(operation.status)}
              </p>
            </div>
            <strong>{centsToBolivianos(operation.totalCents)}</strong>
          </div>
          {operation.status === 'DRAFT' && (
            <>
              <fieldset>
                <legend>Servicios realizados</legend>
                {services.data
                  ?.filter((x) => x.active)
                  .map((x) => (
                    <label key={x.id}>
                      <input
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
              <button
                disabled={!online || busy || selectedServices.length === 0}
                onClick={() => void run(() => salesApi.services(operation, selectedServices))}
              >
                Confirmar servicios reales
              </button>
              <fieldset>
                <legend>Productos vendidos</legend>
                {inventory.data
                  ?.filter((x) => x.active)
                  .map((x) => (
                    <label key={x.productId}>
                      {x.name} · disponibles {x.quantity} · {centsToBolivianos(x.salePriceCents)}
                      <input
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
              <button
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
              </button>
              {canAdjust && (
                <div className="compact-form">
                  <label>
                    Descuento en centavos
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={courtesy}
                      onChange={(e) => setCourtesy(e.target.checked)}
                    />{' '}
                    Cortesía total
                  </label>
                  <label>
                    Motivo
                    <input value={reason} onChange={(e) => setReason(e.target.value)} />
                  </label>
                  <button
                    disabled={!online || busy || !reason}
                    onClick={() =>
                      void run(() => salesApi.adjust(operation, discount, courtesy, reason))
                    }
                  >
                    Aplicar ajuste
                  </button>
                </div>
              )}
              <button
                className="primary-button"
                disabled={!online || busy || operation.items.length === 0}
                onClick={() => void run(() => salesApi.ready(operation))}
              >
                Lista para cobrar
              </button>
            </>
          )}
          {operation.status === 'READY_TO_PAY' && (
            <div className="compact-form">
              <p>
                Total exacto: <strong>{centsToBolivianos(operation.totalCents)}</strong>
              </p>
              {operation.totalCents > 0 && (
                <>
                  <label>
                    Efectivo en centavos
                    <input
                      type="number"
                      min="0"
                      value={cash}
                      onChange={(e) => setCash(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    QR en centavos
                    <input
                      type="number"
                      min="0"
                      value={qr}
                      onChange={(e) => setQr(Number(e.target.value))}
                    />
                  </label>
                </>
              )}
              <button
                className="primary-button"
                disabled={!online || busy || !paymentMatches(operation.totalCents, cash, qr)}
                onClick={() => void run(() => salesApi.pay(operation, payments, paymentKey))}
              >
                {operation.totalCents === 0 ? 'Cerrar cortesía' : 'Confirmar cobro'}
              </button>
            </div>
          )}
          {operation.status === 'PAID' && (
            <article aria-label="Resumen interno">
              <h3>Operación cerrada</h3>
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
                <button
                  disabled={!online || busy}
                  onClick={() => {
                    const reversalReason = window.prompt('Motivo obligatorio del reverso')
                    if (!reversalReason?.trim()) return
                    setBusy(true)
                    setNotice('')
                    void salesApi
                      .reverse(operation, reversalReason)
                      .then(async () => {
                        setOperation(await salesApi.read(operation.id))
                        await daily.refetch()
                      })
                      .catch((error: unknown) =>
                        setNotice(error instanceof Error ? error.message : 'No se pudo revertir.'),
                      )
                      .finally(() => setBusy(false))
                  }}
                >
                  Revertir operación
                </button>
              )}
            </article>
          )}
          {operation.status === 'REVERSED' && (
            <article aria-label="Operación revertida">
              <h3>Operación revertida</h3>
              <p>{operation.reversalReason}</p>
              <p>
                Los cobros quedaron fuera de caja interna; la comisión e inventario se corrigieron
                sin borrar historia.
              </p>
            </article>
          )}
        </section>
      )}
      <section className="master-panel">
        <div className="page-heading">
          <h2>Resumen del día</h2>
          <label>
            Fecha
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <p>
          Pagadas: {daily.data?.paidCount ?? 0} · Total{' '}
          {centsToBolivianos(daily.data?.totalCents ?? 0)} · Efectivo{' '}
          {centsToBolivianos(daily.data?.cashCents ?? 0)} · QR{' '}
          {centsToBolivianos(daily.data?.qrCents ?? 0)}
        </p>
        {daily.data?.operations.map((x) => (
          <button className="appointment-card" key={x.id} onClick={() => setOperation(x)}>
            <strong>{x.customerName}</strong>
            <span>
              {x.barberName} · {operationStatus(x.status)}
            </span>
            <small>{centsToBolivianos(x.totalCents)}</small>
          </button>
        ))}
      </section>
    </main>
  )
}
