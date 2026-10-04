import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocation, useSearchParams } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  isPendingOperation,
  stageOf,
  type Operation,
  type OperationStage,
  type PaymentMethod,
} from '../../core/sales/Sales'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { inventoryApi } from '../../infrastructure/http/inventoryApi'
import { salesApi } from '../../infrastructure/http/salesApi'
import { schedulingApi } from '../../infrastructure/http/schedulingApi'
import { AppIcon } from '../components/AppIcon'
import { Avatar } from '../components/Avatar'
import { Button } from '../components/Button'
import { StatusBadge } from '../components/StatusBadge'
import { Toast } from '../components/Toast'
import { CheckoutStep } from '../components/operations/CheckoutStep'
import { ConsumptionStep, type ConsumptionInput } from '../components/operations/ConsumptionStep'
import { DailyCash } from '../components/operations/DailyCash'
import { OperationDone } from '../components/operations/OperationDone'
import { OperationQueue } from '../components/operations/OperationQueue'
import { WalkInPanel } from '../components/operations/WalkInPanel'
import { originLabel } from '../components/operations/operationText'
import { useConnectivity } from '../hooks/useConnectivity'
import { cn } from '../styles/cn'
import { errorClassName, warningClassName } from '../styles/formStyles'

const shortDate = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00Z`))

const stages: { stage: OperationStage; label: string }[] = [
  { stage: 'consumption', label: 'Consumo' },
  { stage: 'checkout', label: 'Cobro' },
  { stage: 'done', label: 'Listo' },
]

const Progress = ({ current }: { current: OperationStage }) => {
  const index = stages.findIndex((item) => item.stage === current)
  return (
    <ol className="mt-5 grid grid-cols-3 gap-2" aria-label="Progreso de la atención">
      {stages.map((item, position) => {
        // Once charged, every step reads as done.
        const complete = position < index || current === 'done'
        const active = position === index
        return (
          <li
            key={item.stage}
            aria-current={active ? 'step' : undefined}
            className={cn(
              'flex min-h-10 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold',
              complete && 'bg-success-soft text-success-ink',
              active && (complete ? 'bg-success text-on-ink' : 'bg-ink text-on-ink'),
              !complete && !active && 'bg-surface-muted text-ink-muted',
            )}
          >
            {complete ? (
              <AppIcon name="check" size={16} />
            ) : (
              <span className="tabular-nums">{position + 1}</span>
            )}
            {item.label}
            {complete && <span className="sr-only">, hecho</span>}
          </li>
        )
      })}
    </ol>
  )
}

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback

const isNarrow = () =>
  typeof window.matchMedia === 'function' && !window.matchMedia('(min-width: 1024px)').matches

export const OperationsPage = () => {
  const location = useLocation()
  // The agenda opens an attention; the home can ask for the walk-in panel directly.
  const { opened, walkIn: walkInRequested } =
    (location.state as { opened?: Operation; walkIn?: boolean } | null) ?? {}
  const [, setParams] = useSearchParams()
  const today = todayInBusinessTime()
  const [date, setDate] = useState(today)
  const [operation, setOperation] = useState<Operation | undefined>(opened)
  // A draft moves to the charge step once its consumption is saved.
  const [reviewing, setReviewing] = useState(false)
  const [walkIn, setWalkIn] = useState(Boolean(walkInRequested && !opened))
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const clearNotice = useCallback(() => setNotice(''), [])
  const [busy, setBusy] = useState(false)
  // One key per charge attempt: retrying the same payment can never record it twice.
  const [paymentKey, setPaymentKey] = useState(() => crypto.randomUUID())
  const disabled = useConnectivity() !== 'online'
  const heading = useRef<HTMLHeadingElement>(null)

  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const canManage = Boolean(
    session.data?.roles.some((role) => role === 'OWNER' || role === 'ADMIN'),
  )
  const canReverse = Boolean(session.data?.roles.includes('OWNER'))
  const isBarber = Boolean(session.data?.roles.includes('BARBER'))
  const ownBarber = useQuery({
    queryKey: ['operations', 'own-barber', session.data?.id],
    queryFn: salesApi.ownBarber,
    enabled: Boolean(session.data && isBarber && !canManage),
  })
  const daily = useQuery({
    queryKey: ['operations', date],
    queryFn: () => salesApi.daily(date),
    // Barbers open attentions from their phones: reception sees them arrive.
    refetchInterval: disabled ? false : 30_000,
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

  // A link with ?atencion= (or the older ?operationId=) opens that attention directly.
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const id = query.get('atencion') ?? query.get('operationId')
    if (!id) return
    void salesApi
      .read(id)
      .then(setOperation)
      .catch(() => setError('No se pudo cargar la atención.'))
  }, [])

  // Moves focus to the customer's name when another attention opens.
  const openId = operation?.id
  useEffect(() => {
    if (openId) heading.current?.focus({ preventScroll: true })
  }, [openId])

  const rememberInUrl = (id: string | undefined) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        next.delete('operationId')
        if (id) next.set('atencion', id)
        else next.delete('atencion')
        return next
      },
      { replace: true },
    )

  const show = (value: Operation) => {
    if (value.id !== operation?.id) {
      setPaymentKey(crypto.randomUUID())
      setReviewing(false)
    }
    setOperation(value)
    setWalkIn(false)
    setError('')
    rememberInUrl(value.id)
    if (isNarrow()) window.scrollTo({ top: 0 })
  }

  const close = () => {
    setOperation(undefined)
    setWalkIn(false)
    setReviewing(false)
    setError('')
    rememberInUrl(undefined)
  }

  const startWalkIn = () => {
    close()
    setWalkIn(true)
    if (isNarrow()) window.scrollTo({ top: 0 })
  }

  const run = async (action: () => Promise<Operation>, fallback: string) => {
    setBusy(true)
    setError('')
    try {
      const value = await action()
      setOperation(value)
      void daily.refetch()
      return value
    } catch (caught) {
      setError(errorText(caught, fallback))
      return undefined
    } finally {
      setBusy(false)
    }
  }

  const openWalkIn = async (customerId: string, barberId: string) => {
    const value = await run(
      () => salesApi.openWalkIn(customerId, barberId),
      'No se pudo abrir la atención.',
    )
    if (!value) return
    show(value)
    setNotice('Atención abierta')
  }

  // Sends only what changed, so an untouched consumption is never rewritten.
  const saveConsumption = async ({ serviceIds, products }: ConsumptionInput) => {
    if (!operation) return
    let current = operation
    const savedServices = current.items
      .flatMap((item) => (item.type === 'SERVICE' && item.serviceId ? [item.serviceId] : []))
      .sort()
    if (savedServices.join('|') !== [...serviceIds].sort().join('|')) {
      const value = await run(
        () => salesApi.services(current, serviceIds),
        'No se pudo guardar el consumo.',
      )
      if (!value) return
      current = value
    }
    const byProduct = (left: { productId: string }, right: { productId: string }) =>
      left.productId.localeCompare(right.productId)
    const savedProducts = current.items
      .flatMap((item) =>
        item.type === 'PRODUCT' && item.productId
          ? [{ productId: item.productId, quantity: item.quantity }]
          : [],
      )
      .sort(byProduct)
    if (JSON.stringify(savedProducts) !== JSON.stringify([...products].sort(byProduct))) {
      const value = await run(
        () => salesApi.products(current, products),
        'No se pudo guardar el consumo.',
      )
      if (!value) return
    }
    setReviewing(true)
  }

  const adjust = async (discountCents: number, courtesy: boolean, reason: string) => {
    if (!operation) return
    const value = await run(
      () => salesApi.adjust(operation, discountCents, courtesy, reason),
      'No se pudo aplicar el ajuste.',
    )
    if (value) setNotice('Ajuste aplicado')
  }

  // A draft is closed and charged in one tap: confirm the total, then record the payment.
  const charge = async (payments: { method: PaymentMethod; amountCents: number }[]) => {
    if (!operation) return
    let current = operation
    if (current.status === 'DRAFT') {
      const value = await run(() => salesApi.ready(current), 'No se pudo confirmar el total.')
      if (!value) return
      current = value
    }
    const paid = await run(
      () => salesApi.pay(current, payments, paymentKey),
      'No se pudo registrar el cobro. Revisa la conexión antes de reintentar.',
    )
    if (paid) setNotice('Cobro registrado')
  }

  const reverse = async (reason: string) => {
    if (!operation) return
    const value = await run(async () => {
      await salesApi.reverse(operation, reason)
      return salesApi.read(operation.id)
    }, 'No se pudo revertir el cobro.')
    if (value) setNotice('Cobro revertido')
  }

  const operations = daily.data?.operations ?? []
  const pendingCount = operations.filter(isPendingOperation).length
  const collected = centsToBolivianos(daily.data?.totalCents ?? 0)
  const ownBarberProfile =
    !canManage && ownBarber.data
      ? {
          id: ownBarber.data.barberId,
          name:
            barbers.data?.find((barber) => barber.id === ownBarber.data.barberId)?.displayName ??
            'Tu perfil',
        }
      : undefined
  const stage = operation ? stageOf(operation, reviewing) : undefined
  const open = Boolean(operation || walkIn)

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            Atender y cobrar
          </h1>
          <p className="mt-2 text-lg text-pretty text-ink-soft">
            {daily.data
              ? `${pendingCount} por cobrar. ${date === today ? 'Cobrado hoy' : `Cobrado el ${shortDate(date)}`}: ${collected}.`
              : 'Cobra lo que se hizo y registra cómo pagó el cliente.'}
          </p>
        </div>
        <Button
          className={cn('max-sm:w-full', open && 'max-lg:hidden')}
          disabled={disabled}
          onClick={startWalkIn}
        >
          <AppIcon name="plus" size={20} />
          Llegada sin cita
        </Button>
      </header>

      {disabled && (
        <p role="status" className={cn(warningClassName, 'mt-4')}>
          Sin conexión. Puedes consultar las atenciones, pero no cobrar ni cambiar nada hasta volver
          a conectarte.
        </p>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className={cn('grid gap-6', open && 'max-lg:hidden')}>
          {daily.isPending && (
            <div className="grid gap-2" role="status" aria-label="Cargando atenciones">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-18 animate-pulse rounded-control bg-surface-strong" />
              ))}
            </div>
          )}
          {daily.isError && !daily.data && (
            <div
              className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
              role="alert"
            >
              No se pudieron cargar las atenciones.
              <Button variant="secondary" size="sm" onClick={() => void daily.refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          {daily.data && (
            <OperationQueue
              show="pending"
              operations={operations}
              selectedId={operation?.id}
              onSelect={show}
            />
          )}
          <DailyCash
            title={canManage ? 'Caja del día' : 'Mi jornada'}
            date={date}
            summary={daily.data}
            onDateChange={setDate}
          />
          <OperationQueue
            show="closed"
            operations={operations}
            selectedId={operation?.id}
            onSelect={show}
          />
        </div>

        <section className={cn('min-w-0', !open && 'max-lg:hidden')} aria-label="Atención">
          {open && (
            <Button variant="ghost" className="mb-3 lg:hidden" onClick={close}>
              <AppIcon name="arrow-left" size={18} />
              Volver a la lista
            </Button>
          )}

          {walkIn && (
            <WalkInPanel
              barbers={barbers.data}
              ownBarber={ownBarberProfile}
              busy={busy}
              disabled={disabled}
              error={error}
              onCancel={close}
              onOpen={(customerId, barberId) => void openWalkIn(customerId, barberId)}
            />
          )}

          {operation && stage && (
            <article className="rounded-panel bg-surface p-5 shadow-raised sm:p-6">
              <header className="flex items-start gap-4">
                <Avatar name={operation.customerName} size="lg" />
                <div className="min-w-0 flex-1">
                  <h2
                    ref={heading}
                    tabIndex={-1}
                    className="font-display text-3xl leading-tight font-extrabold text-balance outline-none"
                  >
                    {operation.customerName}
                  </h2>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-ink-soft">
                    con {operation.barberName}
                    <StatusBadge tone="muted">{originLabel(operation)}</StatusBadge>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  className="w-12 shrink-0 px-0 max-lg:hidden"
                  aria-label="Cerrar atención"
                  onClick={close}
                >
                  <AppIcon name="close" size={22} />
                </Button>
              </header>
              <Progress current={stage} />

              <div className="mt-6">
                {stage === 'consumption' && (
                  <ConsumptionStep
                    key={operation.id}
                    operation={operation}
                    services={services.data}
                    inventory={inventory.data}
                    busy={busy}
                    disabled={disabled}
                    error={error}
                    onSave={(input) => void saveConsumption(input)}
                  />
                )}
                {stage === 'checkout' && (
                  <CheckoutStep
                    key={operation.id}
                    operation={operation}
                    canAdjust={canManage}
                    busy={busy}
                    disabled={disabled}
                    error={error}
                    onBack={operation.status === 'DRAFT' ? () => setReviewing(false) : undefined}
                    onAdjust={(discountCents, courtesy, reason) =>
                      void adjust(discountCents, courtesy, reason)
                    }
                    onCharge={(payments) => void charge(payments)}
                  />
                )}
                {stage === 'done' && (
                  <OperationDone
                    key={operation.id}
                    operation={operation}
                    canReverse={canReverse}
                    busy={busy}
                    disabled={disabled}
                    error={error}
                    onNext={close}
                    onReverse={(reason) => void reverse(reason)}
                  />
                )}
              </div>
            </article>
          )}

          {!open && (
            <div className="grid min-h-80 place-items-center rounded-panel border-2 border-dashed border-line p-8 text-center">
              <p className="max-w-sm text-lg text-ink-soft">
                Elige a quién cobrar en la lista, o registra una llegada sin cita.
              </p>
            </div>
          )}
        </section>
      </div>
      <Toast message={notice} onDone={clearNotice} />
    </main>
  )
}
