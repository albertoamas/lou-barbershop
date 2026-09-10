import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '../../infrastructure/http/authApi'
import { commissionApi } from '../../infrastructure/http/commissionApi'
import { configurationApi } from '../../infrastructure/http/configurationApi'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  rateAsPercent,
  type CommissionEntryStatus,
  type Settlement,
} from '../../core/commissions/Commissions'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { useConnectivity } from '../hooks/useConnectivity'
import { Button } from '../components/Button'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  panelClassName,
} from '../styles/formStyles'

const sectionTitleClassName = 'font-display text-2xl font-bold sm:text-3xl'
const recordClassName =
  'grid w-full gap-1 rounded-xl border border-lou-fog bg-white p-4 text-left shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-lou-ink hover:shadow-lou-lg'

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
  const [adjustment, setAdjustment] = useState(0)
  const [reason, setReason] = useState('')
  const [method, setMethod] = useState<'CASH' | 'QR'>('CASH')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const online = useConnectivity() === 'online'
  const commissions = useQuery({
    queryKey: ['commissions', barberId, status],
    queryFn: () => commissionApi.commissions(barberId || undefined, status || undefined),
  })
  const settlements = useQuery({
    queryKey: ['settlements', barberId],
    queryFn: () => commissionApi.settlements(barberId || undefined),
  })
  const contractors =
    configuration.data?.barbers
      .filter((x) => x.active && x.employmentType === 'CONTRACTOR')
      .map((barber) => ({
        ...barber,
        name:
          configuration.data!.staff.find((x) => x.id === barber.staffProfileId)?.displayName ??
          'Barbero',
      })) ?? []
  const refresh = async (value?: Settlement) => {
    if (value) setSelected(value)
    await Promise.all([commissions.refetch(), settlements.refetch()])
  }
  const run = async (action: () => Promise<Settlement>) => {
    setBusy(true)
    setNotice('')
    try {
      await refresh(await action())
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo completar la acción.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="mx-auto w-full max-w-360 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
      <div className="border-b border-lou-fog pb-8">
        <div>
          <p className="mb-3 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
            Deuda al barbero
          </p>
          <h1 className="m-0 max-w-4xl font-display text-5xl leading-[0.9] font-bold sm:text-7xl">
            Comisiones separadas del dinero cobrado.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-lou-graphite/65">
            Cada centavo conserva operación, base, tasa histórica y estado.
          </p>
        </div>
      </div>
      {!online && (
        <p
          role="status"
          className="mt-5 rounded-xl border border-amber-800/20 bg-amber-50 p-4 text-sm text-amber-950"
        >
          Sin conexión: puedes ver datos guardados por el navegador, pero no liquidar ni pagar.
        </p>
      )}
      {notice && (
        <p className={`mt-5 ${errorClassName}`} role="alert">
          {notice}
        </p>
      )}
      <section className={`mt-6 ${panelClassName}`}>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
              Trazabilidad
            </p>
            <h2 className={sectionTitleClassName}>Libro de comisiones</h2>
          </div>
          <label className={labelClassName}>
            Estado
            <select
              className={fieldClassName}
              value={status}
              onChange={(e) => setStatus(e.target.value as CommissionEntryStatus | '')}
            >
              <option value="">Todos</option>
              <option value="AVAILABLE">Disponible</option>
              <option value="SETTLED">Liquidada</option>
              <option value="PAID">Pagada</option>
              <option value="VOIDED">Anulada</option>
            </select>
          </label>
        </div>
        <div className="mt-5 grid gap-2">
          {commissions.data?.map((entry) => (
            <article className={recordClassName} key={entry.id}>
              <strong>
                {entry.description} · {centsToBolivianos(entry.amountCents)}
              </strong>
              <span className="text-sm text-lou-graphite/65">
                {entry.type === 'REVERSAL' ? 'Corrección por reverso' : 'Comisión'} · base{' '}
                {centsToBolivianos(entry.baseCents)} × {rateAsPercent(entry.rateBasisPoints)}
              </span>
              <small className="text-xs text-lou-graphite/45">
                {entry.status} · {new Date(entry.earnedAt).toLocaleString('es-BO')}{' '}
                {entry.operationId ? `· operación ${entry.operationId.slice(0, 8)}` : ''}
              </small>
            </article>
          ))}
          {!commissions.isPending && commissions.data?.length === 0 && (
            <p className="rounded-xl border border-dashed border-lou-steel p-5 text-center text-sm text-lou-graphite/55">
              No hay comisiones para este filtro.
            </p>
          )}
        </div>
      </section>
      {isOwner && (
        <section className={`mt-6 ${panelClassName}`}>
          <h2 className={sectionTitleClassName}>Preparar liquidación</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
            <label className={labelClassName}>
              Barbero contratado
              <select
                className={fieldClassName}
                value={barberId}
                onChange={(e) => {
                  setBarberId(e.target.value)
                  setSelected(undefined)
                }}
              >
                <option value="">Selecciona</option>
                {contractors.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClassName}>
              Fecha de corte
              <input
                className={fieldClassName}
                type="date"
                value={cutoff}
                onChange={(e) => setCutoff(e.target.value)}
              />
            </label>
            <Button
              disabled={!online || busy || !barberId}
              onClick={() => void run(() => commissionApi.create(barberId, cutoff))}
            >
              Crear borrador con disponibles
            </Button>
          </div>
        </section>
      )}
      <section className={`mt-6 ${panelClassName}`}>
        <h2 className={sectionTitleClassName}>Liquidaciones</h2>
        <div className="mt-5 grid gap-2">
          {settlements.data?.map((row) => (
            <button className={recordClassName} key={row.id} onClick={() => setSelected(row)}>
              <strong>
                {row.barberName} · {centsToBolivianos(row.payableTotalCents)}
              </strong>
              <span className="text-sm text-lou-graphite/65">
                {row.periodStart} al {row.periodEnd}
              </span>
              <small className="text-xs font-bold tracking-wider text-lou-graphite/45 uppercase">
                {row.status}
              </small>
            </button>
          ))}
        </div>
      </section>
      {selected && (
        <section className={`mt-6 ${panelClassName}`} aria-label="Comprobante de liquidación">
          <div className="flex flex-col justify-between gap-4 border-b border-lou-fog pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.65rem] font-bold tracking-[0.18em] text-lou-graphite/45 uppercase">
                Comprobante interno
              </p>
              <h2 className={sectionTitleClassName}>{selected.barberName}</h2>
              <p className="text-sm text-lou-graphite/60">
                {selected.periodStart} al {selected.periodEnd} · {selected.status}
              </p>
            </div>
            <strong className="font-display text-4xl tabular-nums">
              {centsToBolivianos(selected.payableTotalCents)}
            </strong>
          </div>
          <div className="mt-5 grid gap-2">
            {selected.items.map((item) => (
              <article key={item.id} className={recordClassName}>
                <strong>
                  {item.description} · {centsToBolivianos(item.amountCents)}
                </strong>
                <span className="text-sm text-lou-graphite/65">
                  Base {centsToBolivianos(item.baseCents)} × {rateAsPercent(item.rateBasisPoints)}
                </span>
                <small className="text-xs text-lou-graphite/45">
                  {item.operationId ? `Operación ${item.operationId}` : 'Ajuste de origen'}
                </small>
              </article>
            ))}
          </div>
          {selected.adjustments.map((item) => (
            <p
              className="mt-2 rounded-xl border border-amber-900/15 bg-amber-50 p-3 text-sm text-amber-950"
              key={item.id}
            >
              Ajuste {centsToBolivianos(item.amountCents)} · {item.reason}
            </p>
          ))}
          <p className="mt-5 rounded-xl bg-lou-ink p-4 text-sm text-white">
            Comisiones {centsToBolivianos(selected.commissionTotalCents)} + ajustes{' '}
            {centsToBolivianos(selected.adjustmentTotalCents)} ={' '}
            <strong>{centsToBolivianos(selected.payableTotalCents)}</strong>
          </p>
          {isOwner && selected.status === 'DRAFT' && (
            <div className="mt-5 grid gap-4 rounded-2xl border border-lou-fog bg-lou-paper p-4 sm:grid-cols-2">
              <label className={labelClassName}>
                Ajuste firmado (centavos)
                <input
                  className={fieldClassName}
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(Number(e.target.value))}
                />
              </label>
              <label className={labelClassName}>
                Motivo
                <input
                  className={fieldClassName}
                  maxLength={300}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <Button
                variant="secondary"
                disabled={!online || busy || adjustment === 0 || !reason.trim()}
                onClick={() => void run(() => commissionApi.adjust(selected, adjustment, reason))}
              >
                Agregar ajuste
              </Button>
              <Button
                disabled={!online || busy}
                onClick={() => void run(() => commissionApi.close(selected))}
              >
                Cerrar liquidación
              </Button>
            </div>
          )}
          {isOwner && selected.status === 'CLOSED' && (
            <div className="mt-5 grid gap-4 rounded-2xl border border-lou-fog bg-lou-paper p-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className={labelClassName}>
                Medio
                <select
                  className={fieldClassName}
                  value={method}
                  onChange={(e) => setMethod(e.target.value as 'CASH' | 'QR')}
                >
                  <option value="CASH">Efectivo</option>
                  <option value="QR">QR</option>
                </select>
              </label>
              <Button
                disabled={!online || busy}
                onClick={() =>
                  void run(() => commissionApi.pay(selected, todayInBusinessTime(), method))
                }
              >
                Registrar pago completo
              </Button>
            </div>
          )}
          {selected.status === 'PAID' && (
            <p className="mt-5 rounded-xl border border-emerald-800/20 bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">
              Pagada el {selected.paymentDate} por {selected.paymentMethod}. Este comprobante es
              inmutable.
            </p>
          )}
        </section>
      )}
    </main>
  )
}
