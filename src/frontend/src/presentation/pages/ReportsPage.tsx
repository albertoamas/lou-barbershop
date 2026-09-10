import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import { basisPointsToPercent } from '../../core/reporting/Reporting'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { reportingApi } from '../../infrastructure/http/reportingApi'
import { ReportTabs, type ReportTab } from '../components/ReportTabs'

const shortDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

export const ReportsPage = () => {
  const today = todayInBusinessTime()
  const [dateFrom, setDateFrom] = useState(`${today.slice(0, 8)}01`)
  const [dateTo, setDateTo] = useState(today)
  const [entityType, setEntityType] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const [activeTab, setActiveTab] = useState<ReportTab>('operation')
  const session = useQuery({ queryKey: ['auth', 'session'], queryFn: authApi.current })
  const enabled = session.data?.roles.includes('OWNER') === true && dateFrom <= dateTo
  const daily = useQuery({
    queryKey: ['reports', 'daily', dateTo],
    queryFn: () => reportingApi.daily(dateTo),
    enabled,
  })
  const period = useQuery({
    queryKey: ['reports', 'period', dateFrom, dateTo],
    queryFn: () => reportingApi.period(dateFrom, dateTo),
    enabled,
  })
  const barbers = useQuery({
    queryKey: ['reports', 'barbers', dateFrom, dateTo],
    queryFn: () => reportingApi.barbers(dateFrom, dateTo),
    enabled,
  })
  const audit = useQuery({
    queryKey: ['reports', 'audit', dateFrom, dateTo, entityType, auditPage],
    queryFn: () => reportingApi.audit(dateFrom, dateTo, entityType, auditPage),
    enabled,
  })
  if (session.data && !session.data.roles.includes('OWNER')) {
    return (
      <main className="content">
        <h1>Acceso restringido</h1>
        <p>Los reportes económicos y la auditoría son exclusivos del dueño.</p>
      </main>
    )
  }
  const report = period.data
  return (
    <main className="content reports-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Gestión del dueño</p>
          <h1>Paneles que vuelven a su origen.</h1>
          <p className="lead">
            Cobros, resultado, caja y comisiones se muestran separados para evitar conclusiones
            falsas.
          </p>
        </div>
      </div>

      <section className="report-filters" aria-label="Período del reporte">
        <label>
          Desde
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(event) => {
              setDateFrom(event.target.value)
              setAuditPage(1)
            }}
          />
        </label>
        <label>
          Hasta
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(event) => {
              setDateTo(event.target.value)
              setAuditPage(1)
            }}
          />
        </label>
        <a className="secondary-button" href={reportingApi.exportUrl('period', dateFrom, dateTo)}>
          Descargar operaciones CSV
        </a>
        <a className="secondary-button" href={reportingApi.exportUrl('barbers', dateFrom, dateTo)}>
          Descargar producción CSV
        </a>
      </section>
      <ReportTabs active={activeTab} onChange={setActiveTab} />
      {!enabled && <p role="alert">Selecciona un rango válido.</p>}
      {(period.isPending || daily.isPending) && enabled && (
        <p aria-busy="true">Calculando desde las fuentes…</p>
      )}
      {(period.isError || daily.isError || barbers.isError || audit.isError) && (
        <p role="alert">No se pudieron cargar todos los reportes. Intenta nuevamente.</p>
      )}

      {activeTab === 'operation' && daily.data && (
        <section aria-labelledby="daily-title">
          <h2 id="daily-title">Hoy operativo · {daily.data.date}</h2>
          <div className="metric-grid">
            <a href="#appointments-detail" className="metric-card">
              <small>Citas</small>
              <strong>{daily.data.appointmentCount}</strong>
              <span>
                {Object.entries(daily.data.appointmentsByStatus)
                  .filter(([, count]) => count > 0)
                  .map(([status, count]) => `${status}: ${count}`)
                  .join(' · ') || 'Sin citas'}
              </span>
            </a>
            <a href="#operations-detail" className="metric-card">
              <small>Atenciones pagadas</small>
              <strong>{daily.data.paidOperationCount}</strong>
              <span>{centsToBolivianos(daily.data.chargesCents)} en cargos</span>
            </a>
            <a href="#operations-detail" className="metric-card">
              <small>Cobrado CASH</small>
              <strong>{centsToBolivianos(daily.data.cashCollectedCents)}</strong>
              <span>Dinero recibido</span>
            </a>
            <a href="#operations-detail" className="metric-card">
              <small>Cobrado QR</small>
              <strong>{centsToBolivianos(daily.data.qrCollectedCents)}</strong>
              <span>Dinero recibido</span>
            </a>
          </div>
        </section>
      )}
      {activeTab === 'operation' && daily.data && (
        <section
          id="appointments-detail"
          className="report-table"
          aria-labelledby="appointments-title"
        >
          <h2 id="appointments-title">Origen: citas del día</h2>
          {daily.data.appointments.length === 0 ? (
            <p className="empty-state">No hay citas para este día.</p>
          ) : (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Barbero</th>
                    <th>Servicio / estado</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.data.appointments.map((row) => (
                    <tr key={row.id}>
                      <td>{shortDateTime(row.startsAt)}</td>
                      <td>{row.customerName}</td>
                      <td>{row.barberName}</td>
                      <td>
                        <strong>{row.serviceName}</strong>
                        <small>{row.status}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {report && (
        <>
          {activeTab === 'operation' && (
            <section aria-labelledby="result-title">
              <h2 id="result-title">Resultado del período</h2>
              <p className="metric-definition">
                Resultado operativo aproximado = servicios + productos − costo asignado de productos
                − comisiones generadas − gastos. No es utilidad fiscal.
              </p>
              <div className="metric-grid">
                <a href="#operations-detail" className="metric-card">
                  <small>Servicios</small>
                  <strong>{centsToBolivianos(report.serviceRevenueCents)}</strong>
                  <span>Cargos de operaciones pagadas</span>
                </a>
                <a href="#operations-detail" className="metric-card">
                  <small>Productos</small>
                  <strong>{centsToBolivianos(report.productRevenueCents)}</strong>
                  <span>COGS: {centsToBolivianos(report.productCostCents)}</span>
                </a>
                <a href="/app/comisiones" className="metric-card">
                  <small>Comisión generada</small>
                  <strong>{centsToBolivianos(report.commissionGeneratedCents)}</strong>
                  <span>No es dinero cobrado</span>
                </a>
                <a href="#expenses-detail" className="metric-card">
                  <small>Gastos</small>
                  <strong>{centsToBolivianos(report.expenseCents)}</strong>
                  <span>Registrados y vigentes</span>
                </a>
                <article className="metric-card highlight">
                  <small>Resultado aproximado</small>
                  <strong>{centsToBolivianos(report.approximateOperatingResultCents)}</strong>
                  <span>Antes de impuestos y conceptos no registrados</span>
                </article>
                <article className="metric-card">
                  <small>Ticket promedio</small>
                  <strong>{centsToBolivianos(report.averageTicketCents)}</strong>
                  <span>{report.paidOperationCount} operaciones pagadas</span>
                </article>
              </div>
            </section>
          )}
          {activeTab === 'commissions' && (
            <section id="commissions-detail" aria-labelledby="commissions-title">
              <h2 id="commissions-title">Comisiones del período</h2>
              <p className="metric-definition">
                Deuda generada y liquidaciones, sin confundirlas con el dinero cobrado.
              </p>
              <div className="metric-grid compact-metrics">
                <a href="/app/comisiones" className="metric-card">
                  <small>Disponibles</small>
                  <strong>{centsToBolivianos(report.commissionAvailableCents)}</strong>
                </a>
                <a href="/app/comisiones" className="metric-card">
                  <small>Liquidadas</small>
                  <strong>{centsToBolivianos(report.commissionSettledCents)}</strong>
                </a>
                <a href="/app/comisiones" className="metric-card">
                  <small>Entradas pagadas</small>
                  <strong>{centsToBolivianos(report.commissionPaidCents)}</strong>
                </a>
                <article className="metric-card">
                  <small>Pagos de liquidación</small>
                  <strong>{centsToBolivianos(report.commissionPaymentsCents)}</strong>
                </article>
              </div>
            </section>
          )}
          {activeTab === 'operation' && (
            <section
              id="operations-detail"
              className="report-table"
              aria-labelledby="operations-title"
            >
              <h2 id="operations-title">Origen: operaciones</h2>
              {report.operations.length === 0 ? (
                <p className="empty-state">No hay operaciones pagadas en el período.</p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Barbero / cliente</th>
                        <th>Servicios</th>
                        <th>Productos</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.operations.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td>
                            <strong>{row.barberName}</strong>
                            <small>{row.customerName}</small>
                          </td>
                          <td>
                            {row.serviceQuantity} · {centsToBolivianos(row.serviceRevenueCents)}
                          </td>
                          <td>
                            {row.productQuantity} · {centsToBolivianos(row.productRevenueCents)}
                            <small>COGS {centsToBolivianos(row.productCostCents)}</small>
                          </td>
                          <td>
                            {centsToBolivianos(row.totalCents)}
                            <small>
                              CASH {centsToBolivianos(row.cashCents)} · QR{' '}
                              {centsToBolivianos(row.qrCents)}
                            </small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {activeTab === 'commissions' && (
            <section className="report-table" aria-labelledby="commission-sources-title">
              <div className="report-section-heading">
                <div>
                  <h2 id="commission-sources-title">Origen: comisiones generadas</h2>
                  <p className="metric-definition">
                    Entradas no anuladas ganadas dentro del período.
                  </p>
                </div>
                <a href="/app/comisiones">Abrir ledger completo</a>
              </div>
              {report.commissions.length === 0 ? (
                <p className="empty-state">No hay comisiones generadas.</p>
              ) : (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Barbero</th>
                        <th>Estado</th>
                        <th>Importe</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.commissions.map((row) => (
                        <tr key={row.id}>
                          <td>{row.date}</td>
                          <td>{row.barberName}</td>
                          <td>{row.status}</td>
                          <td>{centsToBolivianos(row.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
          {activeTab === 'cash' && (
            <>
              <section aria-labelledby="cash-title">
                <h2 id="cash-title">Caja del período</h2>
                <p className="metric-definition">
                  Entradas y salidas reales, separadas de la deuda de comisión.
                </p>
                <div className="metric-grid compact-metrics">
                  <article className="metric-card highlight">
                    <small>Flujo neto</small>
                    <strong>{centsToBolivianos(report.cashFlowCents)}</strong>
                    <span>Cobros − compras − gastos − liquidaciones</span>
                  </article>
                  <article className="metric-card">
                    <small>Flujo CASH</small>
                    <strong>{centsToBolivianos(report.cashFlowCashCents)}</strong>
                  </article>
                  <article className="metric-card">
                    <small>Flujo QR</small>
                    <strong>{centsToBolivianos(report.cashFlowQrCents)}</strong>
                  </article>
                  <article className="metric-card">
                    <small>Compras de inventario</small>
                    <strong>{centsToBolivianos(report.inventoryPurchaseCents)}</strong>
                  </article>
                  <article className="metric-card">
                    <small>Gastos</small>
                    <strong>{centsToBolivianos(report.expenseCents)}</strong>
                  </article>
                  <article className="metric-card">
                    <small>Pagos de liquidación</small>
                    <strong>{centsToBolivianos(report.commissionPaymentsCents)}</strong>
                  </article>
                </div>
              </section>
              <section
                id="expenses-detail"
                className="report-table"
                aria-labelledby="expenses-title"
              >
                <h2 id="expenses-title">Origen: gastos y pagos de liquidación</h2>
                {[...report.expenses, ...report.inventoryPurchases, ...report.settlementPayments]
                  .length === 0 ? (
                  <p className="empty-state">No hay salidas registradas.</p>
                ) : (
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Concepto</th>
                          <th>Medio</th>
                          <th>Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.expenses.map((row) => (
                          <tr key={row.id}>
                            <td>{row.date}</td>
                            <td>
                              <strong>{row.category}</strong>
                              <small>{row.description}</small>
                            </td>
                            <td>{row.method}</td>
                            <td>{centsToBolivianos(row.amountCents)}</td>
                          </tr>
                        ))}
                        {report.inventoryPurchases.map((row) => (
                          <tr key={row.id}>
                            <td>{row.date}</td>
                            <td>
                              <strong>Compra de inventario</strong>
                              <small>Recepción confirmada</small>
                            </td>
                            <td>{row.method}</td>
                            <td>{centsToBolivianos(row.amountCents)}</td>
                          </tr>
                        ))}
                        {report.settlementPayments.map((row) => (
                          <tr key={row.id}>
                            <td>{row.date}</td>
                            <td>
                              <strong>Liquidación</strong>
                              <small>{row.barberName}</small>
                            </td>
                            <td>{row.method}</td>
                            <td>{centsToBolivianos(row.amountCents)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}

      {activeTab === 'team' && barbers.data && (
        <section className="report-table" aria-labelledby="barbers-title">
          <h2 id="barbers-title">Producción y ocupación por barbero</h2>
          <p className="metric-definition">
            La ocupación usa minutos de citas completadas sobre horario configurado; llegadas
            directas cuentan en producción, pero no en minutos ocupados.
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Barbero</th>
                  <th>Servicios</th>
                  <th>Productos</th>
                  <th>Producción</th>
                  <th>Ocupación</th>
                </tr>
              </thead>
              <tbody>
                {barbers.data.map((row) => (
                  <tr key={row.barberId}>
                    <td>
                      <strong>{row.barberName}</strong>
                      {row.isOwner && <small>Dueño · sin deuda de comisión</small>}
                    </td>
                    <td>{row.services}</td>
                    <td>{row.products}</td>
                    <td>{centsToBolivianos(row.revenueCents)}</td>
                    <td>
                      {basisPointsToPercent(row.occupancyBasisPoints)}
                      <small>
                        {row.productiveMinutes} / {row.scheduledMinutes} min
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'audit' && (
        <section className="report-table" aria-labelledby="audit-title">
          <div className="report-section-heading">
            <div>
              <h2 id="audit-title">Bitácora de auditoría</h2>
              <p className="metric-definition">Sólo el dueño puede consultar cambios sensibles.</p>
            </div>
            <label>
              Entidad
              <input
                value={entityType}
                maxLength={80}
                placeholder="Ej. settlement"
                onChange={(event) => {
                  setEntityType(event.target.value)
                  setAuditPage(1)
                }}
              />
            </label>
          </div>
          {audit.data?.items.length === 0 ? (
            <p className="empty-state">No hay eventos con estos filtros.</p>
          ) : (
            <div className="audit-list">
              {audit.data?.items.map((row) => (
                <details key={row.id}>
                  <summary>
                    <strong>
                      {row.action} · {row.entityType}
                    </strong>
                    <span>
                      {shortDateTime(row.createdAt)} · {row.actorName ?? 'Sistema'}
                    </span>
                  </summary>
                  <p>
                    Entidad: <code>{row.entityId}</code>
                  </p>
                  {row.beforeData && <pre aria-label="Estado anterior">{row.beforeData}</pre>}
                  {row.afterData && <pre aria-label="Estado posterior">{row.afterData}</pre>}
                </details>
              ))}
            </div>
          )}{' '}
          {audit.data && audit.data.total > audit.data.pageSize && (
            <div className="pagination">
              <button
                type="button"
                disabled={auditPage === 1}
                onClick={() => setAuditPage((value) => value - 1)}
              >
                Anterior
              </button>
              <span>
                Página {auditPage} de {Math.ceil(audit.data.total / audit.data.pageSize)}
              </span>
              <button
                type="button"
                disabled={auditPage * audit.data.pageSize >= audit.data.total}
                onClick={() => setAuditPage((value) => value + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  )
}
