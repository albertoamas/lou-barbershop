import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { centsToBolivianos } from '../../core/configuration/Configuration'
import {
  appointmentReportLabel,
  basisPointsToPercent,
  commissionReportLabel,
  paymentReportLabel,
  type AuditPage,
  type BarberPerformance,
  type DailyDashboard,
  type PeriodReport,
} from '../../core/reporting/Reporting'
import { cn } from '../styles/cn'
import { fieldClassName, labelClassName, panelClassName } from '../styles/formStyles'
import { Button } from './Button'

const money = centsToBolivianos
const shortDate = (value: string) =>
  new Intl.DateTimeFormat('es-BO', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(`${value}T12:00:00-04:00`),
  )
const shortDateTime = (value: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))

const Metric = ({
  label,
  value,
  hint,
  href,
  prominent = false,
}: {
  label: string
  value: ReactNode
  hint: string
  href?: string
  prominent?: boolean
}) => {
  const content = (
    <>
      <span
        className={cn('text-xs font-bold', prominent ? 'text-white/70' : 'text-lou-graphite/50')}
      >
        {label}
      </span>
      <strong className="mt-3 block font-display text-3xl leading-none font-bold tabular-nums sm:text-4xl">
        {value}
      </strong>
      <span
        className={cn(
          'mt-2 block text-xs leading-5',
          prominent ? 'text-white/65' : 'text-lou-graphite/55',
        )}
      >
        {hint}
      </span>
    </>
  )
  const classes = cn(
    'block min-h-32 rounded-2xl border p-5 shadow-lou-sm transition-[translate,box-shadow] duration-300 ease-lou',
    prominent ? 'border-lou-ink bg-lou-ink text-white' : 'border-lou-fog bg-white text-lou-ink',
    href &&
      'hover:-translate-y-px hover:shadow-lou-lg focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-700',
  )
  return href ? (
    <a className={classes} href={href}>
      {content}
    </a>
  ) : (
    <div className={classes}>{content}</div>
  )
}

const MetricGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
)

const SectionHeading = ({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string
  title: string
  detail: string
}) => (
  <div className="mb-4">
    <p className="text-[0.65rem] font-bold tracking-[0.17em] text-lou-graphite/45 uppercase">
      {eyebrow}
    </p>
    <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
    <p className="mt-1 max-w-2xl text-sm leading-6 text-lou-graphite/55">{detail}</p>
  </div>
)

const Empty = ({ children }: { children: ReactNode }) => (
  <p className="rounded-xl bg-lou-paper p-5 text-sm text-lou-graphite/60">{children}</p>
)

export const OperationReport = ({
  period,
  daily,
  dateFrom,
  dateTo,
}: {
  period: PeriodReport
  daily: DailyDashboard
  dateFrom: string
  dateTo: string
}) => (
  <section
    id="report-panel-operation"
    role="tabpanel"
    aria-labelledby="report-tab-operation"
    className="mt-6 space-y-6"
  >
    <div>
      <SectionHeading
        eyebrow="Actividad del período"
        title="Operación y resultado"
        detail={`Del ${shortDate(dateFrom)} al ${shortDate(dateTo)}. Los cargos provienen de atenciones pagadas y no indican por sí solos cuánto queda en caja.`}
      />
      <MetricGrid>
        <Metric
          label="Atenciones pagadas"
          value={period.paidOperationCount}
          hint="Operaciones vigentes en el período"
          href="#operations-detail"
          prominent
        />
        <Metric
          label="Servicios"
          value={money(period.serviceRevenueCents)}
          hint="Cargos de servicios"
          href="#operations-detail"
        />
        <Metric
          label="Productos"
          value={money(period.productRevenueCents)}
          hint={`Costo vendido: ${money(period.productCostCents)}`}
          href="#operations-detail"
        />
        <Metric
          label="Resultado aproximado"
          value={money(period.approximateOperatingResultCents)}
          hint="Antes de impuestos y conceptos no registrados"
          href="#result-detail"
        />
      </MetricGrid>
    </div>
    <section id="result-detail" className={panelClassName} aria-label="Composición del resultado">
      <h3 className="font-display text-2xl font-bold">Cómo se forma el resultado</h3>
      <p className="mt-2 text-sm leading-6 text-lou-graphite/65">
        Cargos de servicios y productos menos costo histórico de productos vendidos, comisión
        generada y gastos. Las compras de inventario afectan la caja, pero no se restan otra vez
        aquí. Este resultado no es utilidad fiscal.
      </p>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold">
        <a href="#operations-detail" className="underline underline-offset-4">
          Ver operaciones
        </a>
        <Link to="/app/comisiones" className="underline underline-offset-4">
          Ver comisiones
        </Link>
        <Link to="/app/inventario" className="underline underline-offset-4">
          Ver gastos
        </Link>
      </div>
      <p className="mt-3 text-xs text-lou-graphite/50">
        Ticket promedio: {money(period.averageTicketCents)} por atención pagada.
      </p>
    </section>
    <section id="operations-detail" className={panelClassName} aria-label="Operaciones fuente">
      <SectionHeading
        eyebrow="Detalle verificable"
        title="Atenciones pagadas"
        detail="Cada total muestra sus servicios, productos, costo vendido y medios de cobro."
      />
      {period.operations.length ? (
        <>
          <div className="space-y-2 lg:hidden">
            {period.operations.map((row) => (
              <article key={row.id} className="rounded-xl border border-lou-fog p-4">
                <div className="flex justify-between gap-3">
                  <div>
                    <strong className="block">{row.barberName}</strong>
                    <span className="text-xs text-lou-graphite/55">
                      {row.customerName} · {shortDate(row.date)}
                    </span>
                  </div>
                  <strong className="text-right tabular-nums">{money(row.totalCents)}</strong>
                </div>
                <p className="mt-3 text-xs text-lou-graphite/65">
                  Servicios {row.serviceQuantity} · {money(row.serviceRevenueCents)}
                  <br />
                  Productos {row.productQuantity} · {money(row.productRevenueCents)} · costo{' '}
                  {money(row.productCostCents)}
                </p>
                <p className="mt-2 text-xs font-semibold">
                  Efectivo {money(row.cashCents)} · QR {money(row.qrCents)}
                </p>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto lg:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-lou-fog text-xs text-lou-graphite/55">
                <tr>
                  <th className="px-3 py-3">Fecha</th>
                  <th className="px-3 py-3">Barbero / cliente</th>
                  <th className="px-3 py-3">Servicios</th>
                  <th className="px-3 py-3">Productos / costo</th>
                  <th className="px-3 py-3">Cobro</th>
                  <th className="px-3 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-lou-fog">
                {period.operations.map((row) => (
                  <tr key={row.id}>
                    <td className="px-3 py-3">{shortDate(row.date)}</td>
                    <td className="px-3 py-3">
                      <strong className="block">{row.barberName}</strong>
                      <span className="text-xs text-lou-graphite/50">{row.customerName}</span>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {row.serviceQuantity} · {money(row.serviceRevenueCents)}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {row.productQuantity} · {money(row.productRevenueCents)}
                      <small className="block text-lou-graphite/50">
                        Costo {money(row.productCostCents)}
                      </small>
                    </td>
                    <td className="px-3 py-3 text-xs tabular-nums">
                      Efectivo {money(row.cashCents)}
                      <br />
                      QR {money(row.qrCents)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold tabular-nums">
                      {money(row.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <Empty>No hay atenciones pagadas en este período.</Empty>
      )}
    </section>
    <section className={panelClassName} aria-label="Citas del día final">
      <SectionHeading
        eyebrow="Día final del período"
        title={`Citas del ${shortDate(daily.date)}`}
        detail="Este bloque corresponde sólo al último día seleccionado, no a todo el período."
      />
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl bg-lou-paper p-4">
          <span className="text-xs font-bold text-lou-graphite/55">Citas</span>
          <strong className="mt-2 block font-display text-3xl">{daily.appointmentCount}</strong>
        </div>
        <div className="rounded-xl bg-lou-paper p-4">
          <span className="text-xs font-bold text-lou-graphite/55">Atenciones pagadas</span>
          <strong className="mt-2 block font-display text-3xl">{daily.paidOperationCount}</strong>
        </div>
      </div>
      {daily.appointments.length ? (
        <ul className="mt-4 divide-y divide-lou-fog">
          {daily.appointments.map((row) => (
            <li key={row.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <div>
                <strong>{row.customerName}</strong>
                <span className="ml-2 text-lou-graphite/55">
                  {row.serviceName} · {row.barberName}
                </span>
              </div>
              <span className="text-xs font-semibold text-lou-graphite/60">
                {shortDateTime(row.startsAt)} · {appointmentReportLabel(row.status)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          <Empty>Sin citas registradas ese día.</Empty>
        </div>
      )}
    </section>
  </section>
)

export const CashReport = ({ period }: { period: PeriodReport }) => (
  <section
    id="report-panel-cash"
    role="tabpanel"
    aria-labelledby="report-tab-cash"
    className="mt-6 space-y-6"
  >
    <div>
      <SectionHeading
        eyebrow="Dinero recibido y pagado"
        title="Caja del período"
        detail="El flujo de caja registra cobros, compras, gastos y pagos reales; no equivale al resultado operativo."
      />
      <MetricGrid>
        <Metric
          label="Flujo neto"
          value={money(period.cashFlowCents)}
          hint="Cobros − compras − gastos − liquidaciones"
          href="#cash-detail"
          prominent
        />
        <Metric
          label="Efectivo neto"
          value={money(period.cashFlowCashCents)}
          hint="Flujo por medio efectivo"
          href="#cash-detail"
        />
        <Metric
          label="QR neto"
          value={money(period.cashFlowQrCents)}
          hint="Flujo por medio QR"
          href="#cash-detail"
        />
        <Metric
          label="Compras de inventario"
          value={money(period.inventoryPurchaseCents)}
          hint="Salida de caja, no COGS del período"
          href="#cash-detail"
        />
      </MetricGrid>
    </div>
    <section id="cash-detail" className={panelClassName}>
      <SectionHeading
        eyebrow="Conciliación"
        title="Entradas y salidas"
        detail="Los importes se mantienen separados por naturaleza; una compra no se cuenta también como gasto operativo."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-lou-fog p-4">
          <h3 className="font-display text-xl font-bold">Entradas por ventas</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Efectivo cobrado</dt>
              <dd className="font-bold tabular-nums">{money(period.cashCollectedCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>QR cobrado</dt>
              <dd className="font-bold tabular-nums">{money(period.qrCollectedCents)}</dd>
            </div>
          </dl>
          <a
            href="#cash-operations"
            className="mt-4 inline-block text-sm font-bold underline underline-offset-4"
          >
            Ver operaciones fuente
          </a>
        </div>
        <div className="rounded-xl border border-lou-fog p-4">
          <h3 className="font-display text-xl font-bold">Salidas</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Compras para reventa</dt>
              <dd className="font-bold tabular-nums">{money(period.inventoryPurchaseCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Gastos operativos</dt>
              <dd className="font-bold tabular-nums">{money(period.expenseCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Pagos de liquidación</dt>
              <dd className="font-bold tabular-nums">{money(period.commissionPaymentsCents)}</dd>
            </div>
          </dl>
          <a
            href="#cash-outflows"
            className="mt-4 inline-block text-sm font-bold underline underline-offset-4"
          >
            Ver salidas fuente
          </a>
        </div>
      </div>
    </section>
    <section id="cash-operations" className={panelClassName}>
      <SectionHeading
        eyebrow="Origen de entradas"
        title="Cobros por operación"
        detail="Una atención con pago mixto presenta efectivo y QR por separado."
      />
      {period.operations.length ? (
        <ul className="divide-y divide-lou-fog">
          {period.operations.map((row) => (
            <li key={row.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
              <div>
                <strong>
                  {row.barberName} · {row.customerName}
                </strong>
                <p className="text-xs text-lou-graphite/55">{shortDate(row.date)}</p>
              </div>
              <div className="text-right font-semibold tabular-nums">
                <p>
                  Efectivo {money(row.cashCents)} · QR {money(row.qrCents)}
                </p>
                <p className="text-xs text-lou-graphite/55">Total {money(row.totalCents)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>Sin cobros registrados en el período.</Empty>
      )}
    </section>
    <section id="cash-outflows" className={panelClassName}>
      <SectionHeading
        eyebrow="Origen de salidas"
        title="Pagos registrados"
        detail="Recepciones de inventario, gastos y liquidaciones permanecen como clases distintas."
      />
      {period.expenses.length +
      period.inventoryPurchases.length +
      period.settlementPayments.length ? (
        <div className="space-y-4">
          <CashSourceGroup
            title="Compras de inventario"
            rows={period.inventoryPurchases.map((row) => ({
              id: row.id,
              date: row.date,
              label: 'Recepción confirmada',
              method: row.method,
              amountCents: row.amountCents,
            }))}
          />
          <CashSourceGroup
            title="Gastos operativos"
            rows={period.expenses.map((row) => ({
              id: row.id,
              date: row.date,
              label: `${row.category} · ${row.description}`,
              method: row.method,
              amountCents: row.amountCents,
            }))}
          />
          <CashSourceGroup
            title="Liquidaciones pagadas"
            rows={period.settlementPayments.map((row) => ({
              id: row.id,
              date: row.date,
              label: row.barberName,
              method: row.method,
              amountCents: row.amountCents,
            }))}
          />
        </div>
      ) : (
        <Empty>Sin salidas registradas en el período.</Empty>
      )}
    </section>
  </section>
)

const CashSourceGroup = ({
  title,
  rows,
}: {
  title: string
  rows: { id: string; date: string; label: string; method: 'CASH' | 'QR'; amountCents: number }[]
}) => (
  <div>
    <h3 className="font-display text-xl font-bold">{title}</h3>
    {rows.length ? (
      <ul className="mt-2 divide-y divide-lou-fog">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
            <div>
              <strong>{row.label}</strong>
              <p className="text-xs text-lou-graphite/55">
                {shortDate(row.date)} · {paymentReportLabel(row.method)}
              </p>
            </div>
            <strong className="tabular-nums">{money(row.amountCents)}</strong>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-1 text-sm text-lou-graphite/50">Sin registros.</p>
    )}
  </div>
)

export const CommissionReport = ({ period }: { period: PeriodReport }) => (
  <section
    id="report-panel-commissions"
    role="tabpanel"
    aria-labelledby="report-tab-commissions"
    className="mt-6 space-y-6"
  >
    <div>
      <SectionHeading
        eyebrow="Obligación con barberos"
        title="Comisiones"
        detail="La deuda generada no se suma al dinero cobrado. Los pagos de liquidaciones sí aparecen como salida en Caja."
      />
      <MetricGrid>
        <Metric
          label="Generadas"
          value={money(period.commissionGeneratedCents)}
          hint="Entradas no anuladas del período"
          href="#commissions-detail"
          prominent
        />
        <Metric
          label="Disponibles"
          value={money(period.commissionAvailableCents)}
          hint="Aún no incluidas en liquidación"
          href="#commissions-detail"
        />
        <Metric
          label="Liquidadas"
          value={money(period.commissionSettledCents)}
          hint="Asignadas a liquidación"
          href="#commissions-detail"
        />
        <Metric
          label="Entradas pagadas"
          value={money(period.commissionPaidCents)}
          hint="Comisiones con estado pagado"
          href="#commissions-detail"
        />
      </MetricGrid>
    </div>
    <div className={panelClassName}>
      <p className="text-sm leading-6 text-lou-graphite/65">
        Pagos de liquidaciones realizados en este período:{' '}
        <strong className="text-lou-ink">{money(period.commissionPaymentsCents)}</strong>. La fecha
        de pago puede diferir de la fecha en que se generó cada comisión.
      </p>
      <Link
        to="/app/comisiones"
        className="mt-3 inline-block text-sm font-bold underline underline-offset-4"
      >
        Abrir libro de comisiones
      </Link>
    </div>
    <section id="commissions-detail" className={panelClassName}>
      <SectionHeading
        eyebrow="Origen de la deuda"
        title="Entradas de comisión"
        detail="Cada entrada conserva el barbero, el estado y el importe histórico; incluye correcciones firmadas."
      />
      {period.commissions.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {period.commissions.map((row) => (
            <article
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-lou-fog p-4"
            >
              <div>
                <strong className="block">{row.barberName}</strong>
                <span className="text-xs text-lou-graphite/55">
                  {shortDate(row.date)} · {commissionReportLabel(row.status)}
                </span>
              </div>
              <strong className="text-right tabular-nums">{money(row.amountCents)}</strong>
            </article>
          ))}
        </div>
      ) : (
        <Empty>No hay comisiones generadas en el período.</Empty>
      )}
    </section>
  </section>
)

export const TeamReport = ({ rows }: { rows: BarberPerformance[] }) => {
  const services = rows.reduce((total, row) => total + row.services, 0)
  const products = rows.reduce((total, row) => total + row.products, 0)
  return (
    <section
      id="report-panel-team"
      role="tabpanel"
      aria-labelledby="report-tab-team"
      className="mt-6 space-y-6"
    >
      <div>
        <SectionHeading
          eyebrow="Producción y ocupación"
          title="Equipo"
          detail="Incluye al dueño como barbero, sin convertir su producción en deuda de comisión."
        />
        <MetricGrid>
          <Metric
            label="Barberos en el reporte"
            value={rows.length}
            hint="Incluido el dueño si corresponde"
            href="#team-detail"
            prominent
          />
          <Metric
            label="Servicios realizados"
            value={services}
            hint="En operaciones pagadas"
            href="#team-detail"
          />
          <Metric
            label="Productos vendidos"
            value={products}
            hint="Unidades en operaciones pagadas"
            href="#team-detail"
          />
        </MetricGrid>
      </div>
      <section id="team-detail" className={panelClassName}>
        <SectionHeading
          eyebrow="Detalle por persona"
          title="Producción y ocupación"
          detail="La ocupación compara minutos de citas completadas con horario configurado. Las llegadas directas aportan producción, pero no minutos de cita."
        />
        {rows.length ? (
          <>
            <div className="grid gap-2 lg:hidden">
              {rows.map((row) => (
                <article key={row.barberId} className="rounded-xl border border-lou-fog p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <strong>{row.barberName}</strong>
                      {row.isOwner && (
                        <span className="ml-2 rounded-full bg-lou-paper px-2 py-1 text-[0.65rem] font-bold">
                          Dueño
                        </span>
                      )}
                    </div>
                    <strong className="tabular-nums">{money(row.revenueCents)}</strong>
                  </div>
                  <p className="mt-2 text-xs text-lou-graphite/60">
                    {row.services} servicios · {row.products} productos
                  </p>
                  <p className="mt-1 text-xs font-semibold">
                    Ocupación {basisPointsToPercent(row.occupancyBasisPoints)} ·{' '}
                    {row.productiveMinutes}/{row.scheduledMinutes} min
                  </p>
                  {row.isOwner && (
                    <p className="mt-2 text-xs text-lou-graphite/50">Sin deuda de comisión</p>
                  )}
                </article>
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-lou-fog text-xs text-lou-graphite/55">
                  <tr>
                    <th className="px-3 py-3">Barbero</th>
                    <th className="px-3 py-3">Servicios</th>
                    <th className="px-3 py-3">Productos</th>
                    <th className="px-3 py-3 text-right">Producción</th>
                    <th className="px-3 py-3 text-right">Ocupación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-lou-fog">
                  {rows.map((row) => (
                    <tr key={row.barberId}>
                      <td className="px-3 py-3">
                        <strong>{row.barberName}</strong>
                        {row.isOwner && (
                          <small className="block text-lou-graphite/50">
                            Dueño · sin deuda de comisión
                          </small>
                        )}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{row.services}</td>
                      <td className="px-3 py-3 tabular-nums">{row.products}</td>
                      <td className="px-3 py-3 text-right font-bold tabular-nums">
                        {money(row.revenueCents)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {basisPointsToPercent(row.occupancyBasisPoints)}
                        <small className="block text-lou-graphite/50">
                          {row.productiveMinutes}/{row.scheduledMinutes} min
                        </small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Empty>No hay producción registrada en el período.</Empty>
        )}
      </section>
    </section>
  )
}

export const AuditReport = ({
  data,
  entityType,
  onEntityChange,
  onPageChange,
}: {
  data: AuditPage
  entityType: string
  onEntityChange: (value: string) => void
  onPageChange: (value: number) => void
}) => {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize))
  return (
    <section
      id="report-panel-audit"
      role="tabpanel"
      aria-labelledby="report-tab-audit"
      className="mt-6 space-y-6"
    >
      <div>
        <SectionHeading
          eyebrow="Cambios sensibles"
          title="Auditoría"
          detail="Sólo el dueño puede consultar quién realizó cada acción y qué cambió."
        />
        <MetricGrid>
          <Metric
            label="Eventos encontrados"
            value={data.total}
            hint="Con el período y la entidad seleccionados"
            href="#audit-detail"
            prominent
          />
          <Metric
            label="Página"
            value={`${data.page} de ${pages}`}
            hint="25 eventos por página como máximo"
            href="#audit-detail"
          />
        </MetricGrid>
      </div>
      <section id="audit-detail" className={panelClassName}>
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading
            eyebrow="Bitácora"
            title="Eventos"
            detail="Abre un registro para ver el antes y el después cuando estén disponibles."
          />
          <label className={cn(labelClassName, 'w-full sm:max-w-64')}>
            Tipo de entidad
            <input
              className={fieldClassName}
              maxLength={80}
              placeholder="Ej. settlement"
              value={entityType}
              onChange={(event) => onEntityChange(event.target.value)}
            />
          </label>
        </div>
        {data.items.length ? (
          <div className="space-y-2">
            {data.items.map((row) => (
              <details key={row.id} className="rounded-xl border border-lou-fog bg-white p-4">
                <summary className="cursor-pointer list-none">
                  <span className="flex flex-wrap justify-between gap-2">
                    <strong className="text-sm">
                      {row.action} · {row.entityType}
                    </strong>
                    <span className="text-xs text-lou-graphite/55">
                      {shortDateTime(row.createdAt)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-lou-graphite/55">
                    {row.actorName ?? 'Sistema'}
                  </span>
                </summary>
                <div className="mt-4 space-y-3 border-t border-lou-fog pt-4 text-xs">
                  <p>
                    Entidad: <code className="break-all">{row.entityId}</code>
                  </p>
                  {row.beforeData && (
                    <div>
                      <strong>Antes</strong>
                      <pre
                        className="mt-1 max-h-64 overflow-auto rounded-lg bg-lou-paper p-3 whitespace-pre-wrap break-all"
                        aria-label="Estado anterior"
                      >
                        {row.beforeData}
                      </pre>
                    </div>
                  )}
                  {row.afterData && (
                    <div>
                      <strong>Después</strong>
                      <pre
                        className="mt-1 max-h-64 overflow-auto rounded-lg bg-lou-paper p-3 whitespace-pre-wrap break-all"
                        aria-label="Estado posterior"
                      >
                        {row.afterData}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <Empty>No hay eventos con estos filtros.</Empty>
        )}
        {pages > 1 && (
          <nav
            className="mt-5 flex flex-wrap items-center justify-between gap-3"
            aria-label="Páginas de auditoría"
          >
            <Button
              variant="secondary"
              disabled={data.page <= 1}
              onClick={() => onPageChange(data.page - 1)}
            >
              Anterior
            </Button>
            <span className="text-xs font-semibold">
              Página {data.page} de {pages}
            </span>
            <Button
              variant="secondary"
              disabled={data.page >= pages}
              onClick={() => onPageChange(data.page + 1)}
            >
              Siguiente
            </Button>
          </nav>
        )}
      </section>
    </section>
  )
}
