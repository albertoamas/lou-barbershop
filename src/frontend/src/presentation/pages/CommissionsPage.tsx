import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  commissionBalances,
  commissionStatusLabel,
  rateAsPercent,
  settlementStatusLabel,
  signedBolivianosToCents,
  type CommissionEntryStatus,
  type Settlement,
  type SettlementStatus,
} from '../../core/commissions/Commissions'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { commissionApi } from '../../infrastructure/http/commissionApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { AgendaDialog } from '../components/AgendaDialog'
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
const statusTone: Record<SettlementStatus, string> = {
  DRAFT: 'border-amber-700/20 bg-amber-50 text-amber-950',
  CLOSED: 'border-sky-800/20 bg-sky-50 text-sky-950',
  PAID: 'border-emerald-800/20 bg-emerald-50 text-emerald-950',
}
const commissionTone: Record<CommissionEntryStatus, string> = {
  AVAILABLE: 'bg-amber-50 text-amber-950',
  SETTLED: 'bg-sky-50 text-sky-950',
  PAID: 'bg-emerald-50 text-emerald-950',
  VOIDED: 'bg-lou-fog text-lou-graphite/65',
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00-04:00`),
  )

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/La_Paz',
  }).format(new Date(value))

const SettlementTimeline = ({ value }: { value: Settlement }) => {
  const activeIndex = value.status === 'DRAFT' ? 0 : value.status === 'CLOSED' ? 1 : 2
  const steps = [
    ['Borrador', 'Operaciones reunidas'],
    ['Cerrada', 'Importe confirmado'],
    ['Pagada', 'Pago registrado'],
  ]
  return (
    <ol
      className="grid grid-cols-3 gap-1"
      aria-label={`Estado: ${settlementStatusLabel(value.status)}`}
    >
      {steps.map(([label, detail], index) => {
        const complete = index < activeIndex
        const active = index === activeIndex
        return (
          <li key={label} aria-current={active ? 'step' : undefined}>
            <div className="flex items-center">
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold transition-colors duration-300',
                  (complete || active) && 'border-lou-ink bg-lou-ink text-white',
                  !complete && !active && 'border-lou-steel bg-white text-lou-graphite/40',
                )}
              >
                {complete ? <AppIcon name="check" size={14} /> : index + 1}
              </span>
              {index < steps.length - 1 && (
                <span className={cn('h-px w-full bg-lou-fog', complete && 'bg-lou-ink')} />
              )}
            </div>
            <strong className="mt-2 block text-xs">{label}</strong>
            <span className="hidden text-[0.65rem] text-lou-graphite/50 sm:block">{detail}</span>
          </li>
        )
      })}
    </ol>
  )
}

export const CommissionsPage = () => {
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const isOwner = session.data?.roles.includes('OWNER') ?? false
  const configuration = useQuery({
    queryKey: ['configuration'],
    queryFn: configurationApi.load,
    enabled: isOwner,
  })
  const [barberId, setBarberId] = useState('')
  const [status, setStatus] = useState<CommissionEntryStatus | ''>('')
  const [cutoff, setCutoff] = useState(todayInBusinessTime())
  const [selected, setSelected] = useState<Settlement>()
  const [showCreate, setShowCreate] = useState(false)
  const [adjustment, setAdjustment] = useState('')
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<'CASH' | 'QR'>('CASH')
  const [notice, setNotice] = useState('')
  const [noticeIsError, setNoticeIsError] = useState(false)
  const [busy, setBusy] = useState(false)
  const online = useConnectivity() === 'online'
  const commissions = useQuery({
    queryKey: ['commissions', barberId, status],
    queryFn: () => commissionApi.commissions(barberId || undefined, status || undefined),
  })
  const summaryCommissions = useQuery({
    queryKey: ['commissions', barberId, 'summary'],
    queryFn: () => commissionApi.commissions(barberId || undefined),
  })
  const settlements = useQuery({
    queryKey: ['settlements', barberId],
    queryFn: () => commissionApi.settlements(barberId || undefined),
  })
  const contractors = useMemo(
    () =>
      configuration.data?.barbers
        .filter((item) => item.active && item.employmentType === 'CONTRACTOR')
        .map((barber) => ({
          ...barber,
          name:
            configuration.data!.staff.find((item) => item.id === barber.staffProfileId)
              ?.displayName ?? 'Barbero',
        })) ?? [],
    [configuration.data],
  )
  const balances = commissionBalances(summaryCommissions.data)
  const adjustmentCents = signedBolivianosToCents(adjustment)

  const refresh = async (value?: Settlement) => {
    if (value) setSelected(value)
    await Promise.all([commissions.refetch(), summaryCommissions.refetch(), settlements.refetch()])
  }
  const run = async (action: () => Promise<Settlement>, successMessage: string) => {
    setBusy(true)
    setNotice('')
    try {
      await refresh(await action())
      setNoticeIsError(false)
      setNotice(successMessage)
      return true
    } catch (error) {
      setNoticeIsError(true)
      setNotice(error instanceof Error ? error.message : 'No se pudo completar la acción.')
      return false
    } finally {
      setBusy(false)
    }
  }
  const createSettlement = async () => {
    const created = await run(
      () => commissionApi.create(barberId, cutoff),
      'Liquidación creada como borrador.',
    )
    if (created) setShowCreate(false)
  }
  const addAdjustment = async () => {
    if (!selected || adjustmentCents === null) return
    const added = await run(
      () => commissionApi.adjust(selected, adjustmentCents, reason.trim()),
      'Ajuste agregado al borrador.',
    )
    if (added) {
      setAdjustment('')
      setReason('')
    }
  }

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="flex flex-col justify-between gap-5 border-b border-lou-fog pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            {isOwner ? 'Control de deuda' : 'Mi producción'}
          </p>
          <h1 className="m-0 font-display text-5xl leading-[0.9] font-bold sm:text-6xl">
            {isOwner ? 'Comisiones' : 'Mis comisiones'}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
            {isOwner
              ? 'Consulta lo que se debe a cada barbero y registra su liquidación sin mezclarlo con la caja.'
              : 'Consulta tu saldo, las operaciones que lo forman y el historial de tus liquidaciones.'}
          </p>
        </div>
        {isOwner && (
          <Button disabled={!online} onClick={() => setShowCreate(true)}>
            Nueva liquidación
          </Button>
        )}
      </header>

      {!online && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Sin conexión: puedes consultar datos guardados, pero no crear, cerrar ni pagar
          liquidaciones.
        </p>
      )}
      {notice && (
        <p
          className={cn(
            'mt-5 rounded-xl border p-3 text-sm font-semibold',
            noticeIsError ? errorClassName : 'border-emerald-800/20 bg-emerald-50 text-emerald-950',
          )}
          role={noticeIsError ? 'alert' : 'status'}
        >
          {notice}
        </p>
      )}

      <section className="mt-5" aria-label="Resumen de comisiones">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-bold">Saldo de comisión</h2>
          <span className="text-right text-xs font-semibold text-lou-graphite/50">
            No forma parte del dinero cobrado
          </span>
        </div>
        <dl className="grid gap-2 sm:grid-cols-3">
          {[
            ['Disponible para liquidar', balances.availableCents, 'Deuda aún no agrupada'],
            ['En liquidaciones', balances.inSettlementCents, 'Borradores o cierres pendientes'],
            ['Pagado histórico', balances.paidCents, 'Liquidaciones ya pagadas'],
          ].map(([label, value, detail], index) => (
            <div
              className={cn(
                'rounded-2xl border p-4 sm:p-5',
                index === 0 ? 'border-lou-ink bg-lou-ink text-white' : 'border-lou-fog bg-white',
              )}
              key={String(label)}
            >
              <dt
                className={cn(
                  'text-xs font-bold',
                  index === 0 ? 'text-white/65' : 'text-lou-graphite/50',
                )}
              >
                {String(label)}
              </dt>
              <dd className="mt-2 font-display text-3xl font-bold tabular-nums">
                {centsToBolivianos(Number(value))}
              </dd>
              <p
                className={cn(
                  'mt-1 text-xs',
                  index === 0 ? 'text-white/60' : 'text-lou-graphite/50',
                )}
              >
                {String(detail)}
              </p>
            </div>
          ))}
        </dl>
      </section>

      <section className={`mt-5 ${panelClassName}`} aria-label="Filtros de comisiones">
        <div className="grid gap-4 sm:grid-cols-2">
          {isOwner && (
            <label className={labelClassName}>
              Barbero
              <select
                className={fieldClassName}
                value={barberId}
                onChange={(event) => {
                  setBarberId(event.target.value)
                  setSelected(undefined)
                }}
              >
                <option value="">Todo el equipo contratado</option>
                {contractors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={labelClassName}>
            Estado de la comisión
            <select
              className={fieldClassName}
              value={status}
              onChange={(event) => setStatus(event.target.value as CommissionEntryStatus | '')}
            >
              <option value="">Todos los estados</option>
              <option value="AVAILABLE">Disponible</option>
              <option value="SETTLED">En liquidación</option>
              <option value="PAID">Pagada</option>
              <option value="VOIDED">Anulada</option>
            </select>
          </label>
        </div>
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <section className={panelClassName} aria-labelledby="commission-book-title">
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
            Operación por operación
          </p>
          <h2 className={sectionTitleClassName} id="commission-book-title">
            Detalle del saldo
          </h2>
          <div className="mt-5 grid gap-2">
            {commissions.isPending && <p role="status">Cargando comisiones…</p>}
            {commissions.isError && (
              <p className={errorClassName} role="alert">
                No se pudieron cargar las comisiones.
              </p>
            )}
            {commissions.data?.map((entry) => (
              <article className="rounded-xl border border-lou-fog bg-white p-4" key={entry.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <strong className="block truncate">{entry.description}</strong>
                    <span className="mt-1 block text-xs text-lou-graphite/55">
                      {formatDateTime(entry.earnedAt)}
                      {entry.operationId ? ` · Operación ${entry.operationId.slice(0, 8)}` : ''}
                    </span>
                  </div>
                  <strong className="shrink-0 font-display text-xl tabular-nums">
                    {centsToBolivianos(entry.amountCents)}
                  </strong>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-lou-fog pt-3">
                  <span className="text-xs text-lou-graphite/60">
                    {entry.type === 'REVERSAL' ? 'Corrección por reverso' : 'Comisión'} · base{' '}
                    {centsToBolivianos(entry.baseCents)} × {rateAsPercent(entry.rateBasisPoints)}
                  </span>
                  <span
                    className={cn(
                      'rounded-full px-2.5 py-1 text-[0.65rem] font-bold',
                      commissionTone[entry.status],
                    )}
                  >
                    {commissionStatusLabel(entry.status)}
                  </span>
                </div>
              </article>
            ))}
            {!commissions.isPending && commissions.data?.length === 0 && (
              <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
                No hay comisiones para este filtro.
              </p>
            )}
          </div>
        </section>

        <section className={panelClassName} aria-labelledby="settlements-title">
          <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
            Historial y pendientes
          </p>
          <h2 className={sectionTitleClassName} id="settlements-title">
            Liquidaciones
          </h2>
          <div className="mt-5 grid gap-2">
            {settlements.isPending && <p role="status">Cargando liquidaciones…</p>}
            {settlements.isError && (
              <p className={errorClassName} role="alert">
                No se pudieron cargar las liquidaciones.
              </p>
            )}
            {settlements.data?.map((row) => (
              <button
                className="group grid w-full gap-3 rounded-xl border border-lou-fog bg-white p-4 text-left transition-[translate,box-shadow,border-color] duration-300 ease-lou hover:-translate-y-0.5 hover:shadow-lou-lg"
                key={row.id}
                onClick={() => setSelected(row)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong>{row.barberName}</strong>
                    <span className="mt-1 block text-xs text-lou-graphite/55">
                      {formatDate(row.periodStart)} – {formatDate(row.periodEnd)}
                    </span>
                  </div>
                  <AppIcon name="arrow-right" size={18} />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <span
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[0.65rem] font-bold',
                      statusTone[row.status],
                    )}
                  >
                    {settlementStatusLabel(row.status)}
                  </span>
                  <strong className="font-display text-xl tabular-nums">
                    {centsToBolivianos(row.payableTotalCents)}
                  </strong>
                </div>
              </button>
            ))}
            {!settlements.isPending && settlements.data?.length === 0 && (
              <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
                Todavía no hay liquidaciones.
              </p>
            )}
          </div>
        </section>
      </div>

      {showCreate && isOwner && (
        <AgendaDialog label="Crear liquidación">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                Nuevo borrador
              </p>
              <h2 className="font-display text-3xl font-bold">Preparar liquidación</h2>
              <p className="mt-2 text-sm leading-6 text-lou-graphite/60">
                Agrupa las comisiones disponibles del barbero hasta la fecha elegida. Podrás
                revisarlas antes de cerrar.
              </p>
            </div>
            <Button variant="ghost" aria-label="Cerrar" onClick={() => setShowCreate(false)}>
              <AppIcon name="close" />
            </Button>
          </div>
          <div className="mt-6 grid gap-4">
            <label className={labelClassName}>
              Barbero contratado
              <select
                className={fieldClassName}
                value={barberId}
                onChange={(event) => setBarberId(event.target.value)}
              >
                <option value="">Selecciona un barbero</option>
                {contractors.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClassName}>
              Incluir comisiones hasta
              <input
                className={fieldClassName}
                type="date"
                value={cutoff}
                onChange={(event) => setCutoff(event.target.value)}
              />
            </label>
            <div className="rounded-xl border border-amber-800/15 bg-amber-50 p-4 text-sm text-amber-950">
              Esto crea un borrador. No registra el pago ni mueve dinero de la caja.
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setShowCreate(false)}>
                Cancelar
              </Button>
              <Button
                disabled={!online || busy || !barberId}
                onClick={() => void createSettlement()}
              >
                {busy ? 'Creando…' : 'Crear borrador'}
              </Button>
            </div>
          </div>
        </AgendaDialog>
      )}

      {selected && (
        <AgendaDialog label="Detalle de liquidación">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                Liquidación
              </p>
              <h2 className="font-display text-3xl font-bold">{selected.barberName}</h2>
              <p className="mt-1 text-sm text-lou-graphite/60">
                {formatDate(selected.periodStart)} – {formatDate(selected.periodEnd)}
              </p>
            </div>
            <Button
              variant="ghost"
              aria-label="Cerrar detalle"
              onClick={() => setSelected(undefined)}
            >
              <AppIcon name="close" />
            </Button>
          </div>

          <div className="mt-6 rounded-2xl border border-lou-fog bg-lou-paper p-4 sm:p-5">
            <SettlementTimeline value={selected} />
          </div>

          <div className="mt-6 flex items-end justify-between gap-4 border-b border-lou-fog pb-5">
            <div>
              <span className="text-xs font-bold text-lou-graphite/50">Deuda de comisión</span>
              <p className="mt-1 text-xs text-lou-graphite/45">No es efectivo o QR cobrado</p>
            </div>
            <strong className="font-display text-4xl font-bold tabular-nums">
              {centsToBolivianos(selected.payableTotalCents)}
            </strong>
          </div>

          <div className="mt-5 grid gap-2">
            <h3 className="font-display text-xl font-bold">Operaciones incluidas</h3>
            {selected.items.map((item) => (
              <article key={item.id} className="rounded-xl border border-lou-fog p-4">
                <div className="flex items-start justify-between gap-3">
                  <strong>{item.description}</strong>
                  <strong className="shrink-0 tabular-nums">
                    {centsToBolivianos(item.amountCents)}
                  </strong>
                </div>
                <p className="mt-1 text-xs text-lou-graphite/55">
                  Base {centsToBolivianos(item.baseCents)} × {rateAsPercent(item.rateBasisPoints)}
                  {item.operationId ? ` · Operación ${item.operationId.slice(0, 8)}` : ''}
                </p>
              </article>
            ))}
          </div>

          {selected.adjustments.length > 0 && (
            <div className="mt-5 grid gap-2">
              <h3 className="font-display text-xl font-bold">Ajustes autorizados</h3>
              {selected.adjustments.map((item) => (
                <p
                  className="rounded-xl border border-amber-900/15 bg-amber-50 p-3 text-sm text-amber-950"
                  key={item.id}
                >
                  <strong>{centsToBolivianos(item.amountCents)}</strong> · {item.reason}
                </p>
              ))}
            </div>
          )}

          <dl className="mt-5 grid gap-2 rounded-xl bg-lou-ink p-4 text-sm text-white">
            <div className="flex justify-between gap-4">
              <dt>Comisiones</dt>
              <dd className="tabular-nums">{centsToBolivianos(selected.commissionTotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Ajustes</dt>
              <dd className="tabular-nums">{centsToBolivianos(selected.adjustmentTotalCents)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/20 pt-2 font-bold">
              <dt>Total a pagar</dt>
              <dd className="tabular-nums">{centsToBolivianos(selected.payableTotalCents)}</dd>
            </div>
          </dl>

          {isOwner && selected.status === 'DRAFT' && (
            <div className="mt-6 grid gap-4 rounded-2xl border border-lou-fog bg-lou-paper p-4">
              <div>
                <h3 className="font-display text-xl font-bold">Revisar borrador</h3>
                <p className="mt-1 text-xs text-lou-graphite/55">
                  Usa un valor negativo para descontar. El motivo queda en el historial.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClassName}>
                  Ajuste en Bs
                  <input
                    className={fieldClassName}
                    inputMode="decimal"
                    placeholder="Ej. -10,00 o 5,50"
                    value={adjustment}
                    onChange={(event) => setAdjustment(event.target.value)}
                  />
                </label>
                <label className={labelClassName}>
                  Motivo
                  <input
                    className={fieldClassName}
                    maxLength={300}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
              </div>
              {adjustment && adjustmentCents === null && (
                <p className={errorClassName}>
                  Escribe un importe distinto de cero con hasta dos decimales.
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="secondary"
                  disabled={!online || busy || adjustmentCents === null || !reason.trim()}
                  onClick={() => void addAdjustment()}
                >
                  Agregar ajuste
                </Button>
                <Button
                  disabled={!online || busy}
                  onClick={() =>
                    void run(
                      () => commissionApi.close(selected),
                      'Liquidación cerrada. Ya está lista para registrar el pago.',
                    )
                  }
                >
                  {busy ? 'Procesando…' : 'Cerrar liquidación'}
                </Button>
              </div>
            </div>
          )}

          {isOwner && selected.status === 'CLOSED' && (
            <div className="mt-6 grid gap-4 rounded-2xl border border-sky-800/15 bg-sky-50 p-4">
              <div>
                <h3 className="font-display text-xl font-bold">Registrar pago completo</h3>
                <p className="mt-1 text-xs text-sky-950/65">
                  Confirma sólo después de entregar {centsToBolivianos(selected.payableTotalCents)}{' '}
                  al barbero.
                </p>
              </div>
              <label className={labelClassName}>
                Medio de pago
                <select
                  className={fieldClassName}
                  value={method}
                  onChange={(event) => setMethod(event.target.value as 'CASH' | 'QR')}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="QR">QR</option>
                </select>
              </label>
              <Button
                disabled={!online || busy}
                onClick={() =>
                  void run(
                    () => commissionApi.pay(selected, todayInBusinessTime(), method),
                    'Pago de comisión registrado.',
                  )
                }
              >
                {busy
                  ? 'Registrando…'
                  : `Confirmar pago de ${centsToBolivianos(selected.payableTotalCents)}`}
              </Button>
            </div>
          )}

          {selected.status === 'PAID' && (
            <p className="mt-6 rounded-xl border border-emerald-800/20 bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">
              Pagada el {selected.paymentDate ? formatDate(selected.paymentDate) : '—'} por{' '}
              {selected.paymentMethod === 'CASH' ? 'efectivo' : 'QR'}. Este comprobante no se puede
              modificar.
            </p>
          )}
        </AgendaDialog>
      )}
    </main>
  )
}
