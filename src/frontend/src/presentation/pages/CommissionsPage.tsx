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
    <main className="content operations-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Deuda al barbero · Fase 9</p>
          <h1>Comisiones separadas del dinero cobrado.</h1>
          <p>Cada centavo conserva operación, base, tasa histórica y estado.</p>
        </div>
      </div>
      {!online && (
        <p role="status" className="conflict-notice">
          Sin conexión: puedes ver datos guardados por el navegador, pero no liquidar ni pagar.
        </p>
      )}
      {notice && <p role="alert">{notice}</p>}
      <section className="master-panel">
        <div className="page-heading">
          <h2>Libro de comisiones</h2>
          <label>
            Estado
            <select
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
        {commissions.data?.map((entry) => (
          <article className="appointment-card" key={entry.id}>
            <strong>
              {entry.description} · {centsToBolivianos(entry.amountCents)}
            </strong>
            <span>
              {entry.type === 'REVERSAL' ? 'Corrección por reverso' : 'Comisión'} · base{' '}
              {centsToBolivianos(entry.baseCents)} × {rateAsPercent(entry.rateBasisPoints)}
            </span>
            <small>
              {entry.status} · {new Date(entry.earnedAt).toLocaleString('es-BO')}{' '}
              {entry.operationId ? `· operación ${entry.operationId.slice(0, 8)}` : ''}
            </small>
          </article>
        ))}
        {!commissions.isPending && commissions.data?.length === 0 && (
          <p>No hay comisiones para este filtro.</p>
        )}
      </section>
      {isOwner && (
        <section className="master-panel">
          <h2>Preparar liquidación</h2>
          <div className="compact-form">
            <label>
              Barbero contratado
              <select
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
            <label>
              Fecha de corte
              <input type="date" value={cutoff} onChange={(e) => setCutoff(e.target.value)} />
            </label>
            <button
              className="primary-button"
              disabled={!online || busy || !barberId}
              onClick={() => void run(() => commissionApi.create(barberId, cutoff))}
            >
              Crear borrador con disponibles
            </button>
          </div>
        </section>
      )}
      <section className="master-panel">
        <h2>Liquidaciones</h2>
        {settlements.data?.map((row) => (
          <button className="appointment-card" key={row.id} onClick={() => setSelected(row)}>
            <strong>
              {row.barberName} · {centsToBolivianos(row.payableTotalCents)}
            </strong>
            <span>
              {row.periodStart} al {row.periodEnd}
            </span>
            <small>{row.status}</small>
          </button>
        ))}
      </section>
      {selected && (
        <section className="master-panel" aria-label="Comprobante de liquidación">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Comprobante interno</p>
              <h2>{selected.barberName}</h2>
              <p>
                {selected.periodStart} al {selected.periodEnd} · {selected.status}
              </p>
            </div>
            <strong>{centsToBolivianos(selected.payableTotalCents)}</strong>
          </div>
          {selected.items.map((item) => (
            <article key={item.id} className="appointment-card">
              <strong>
                {item.description} · {centsToBolivianos(item.amountCents)}
              </strong>
              <span>
                Base {centsToBolivianos(item.baseCents)} × {rateAsPercent(item.rateBasisPoints)}
              </span>
              <small>
                {item.operationId ? `Operación ${item.operationId}` : 'Ajuste de origen'}
              </small>
            </article>
          ))}
          {selected.adjustments.map((item) => (
            <p key={item.id}>
              Ajuste {centsToBolivianos(item.amountCents)} · {item.reason}
            </p>
          ))}
          <p>
            Comisiones {centsToBolivianos(selected.commissionTotalCents)} + ajustes{' '}
            {centsToBolivianos(selected.adjustmentTotalCents)} ={' '}
            <strong>{centsToBolivianos(selected.payableTotalCents)}</strong>
          </p>
          {isOwner && selected.status === 'DRAFT' && (
            <div className="compact-form">
              <label>
                Ajuste firmado (centavos)
                <input
                  type="number"
                  value={adjustment}
                  onChange={(e) => setAdjustment(Number(e.target.value))}
                />
              </label>
              <label>
                Motivo
                <input value={reason} onChange={(e) => setReason(e.target.value)} />
              </label>
              <button
                disabled={!online || busy || adjustment === 0 || !reason.trim()}
                onClick={() => void run(() => commissionApi.adjust(selected, adjustment, reason))}
              >
                Agregar ajuste
              </button>
              <button
                className="primary-button"
                disabled={!online || busy}
                onClick={() => void run(() => commissionApi.close(selected))}
              >
                Cerrar liquidación
              </button>
            </div>
          )}
          {isOwner && selected.status === 'CLOSED' && (
            <div className="compact-form">
              <label>
                Medio
                <select value={method} onChange={(e) => setMethod(e.target.value as 'CASH' | 'QR')}>
                  <option value="CASH">Efectivo</option>
                  <option value="QR">QR</option>
                </select>
              </label>
              <button
                className="primary-button"
                disabled={!online || busy}
                onClick={() =>
                  void run(() => commissionApi.pay(selected, todayInBusinessTime(), method))
                }
              >
                Registrar pago completo
              </button>
            </div>
          )}
          {selected.status === 'PAID' && (
            <p>
              Pagada el {selected.paymentDate} por {selected.paymentMethod}. Este comprobante es
              inmutable.
            </p>
          )}
        </section>
      )}
    </main>
  )
}
