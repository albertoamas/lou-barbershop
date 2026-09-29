import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { addCalendarDays, todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { reportingApi } from '../../infrastructure/http/reportingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { ReportTabs, type ReportTab } from '../components/ReportTabs'
import {
  AuditReport,
  CashReport,
  CommissionReport,
  OperationReport,
  TeamReport,
} from '../components/ReportSections'
import { cn } from '../styles/cn'
import {
  errorClassName,
  fieldClassName,
  labelClassName,
  panelClassName,
} from '../styles/formStyles'

const validDate = (value: string | null): value is string =>
  Boolean(
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)),
  )
const validTab = (value: string | null): value is ReportTab =>
  value === 'operation' ||
  value === 'cash' ||
  value === 'commissions' ||
  value === 'team' ||
  value === 'audit'

export const ReportsPage = () => {
  const today = todayInBusinessTime()
  const [params, setParams] = useSearchParams()
  const dateFrom = validDate(params.get('desde')) ? params.get('desde')! : `${today.slice(0, 8)}01`
  const dateTo = validDate(params.get('hasta')) ? params.get('hasta')! : today
  const activeTab: ReportTab = validTab(params.get('vista'))
    ? (params.get('vista') as ReportTab)
    : 'operation'
  const [entityType, setEntityType] = useState('')
  const [auditPage, setAuditPage] = useState(1)
  const validRange = dateFrom <= dateTo && dateTo <= addCalendarDays(dateFrom, 366)
  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })
  const isOwner = session.data?.roles.includes('OWNER') ?? false
  const period = useQuery({
    queryKey: ['reports', 'period', dateFrom, dateTo],
    queryFn: () => reportingApi.period(dateFrom, dateTo),
    enabled: isOwner && validRange && ['operation', 'cash', 'commissions'].includes(activeTab),
  })
  const daily = useQuery({
    queryKey: ['reports', 'daily', dateTo],
    queryFn: () => reportingApi.daily(dateTo),
    enabled: isOwner && validRange && activeTab === 'operation',
  })
  const team = useQuery({
    queryKey: ['reports', 'barbers', dateFrom, dateTo],
    queryFn: () => reportingApi.barbers(dateFrom, dateTo),
    enabled: isOwner && validRange && activeTab === 'team',
  })
  const audit = useQuery({
    queryKey: ['reports', 'audit', dateFrom, dateTo, entityType, auditPage],
    queryFn: () => reportingApi.audit(dateFrom, dateTo, entityType, auditPage),
    enabled: isOwner && validRange && activeTab === 'audit',
  })
  const changeParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    next.set(key, value)
    setParams(next, { replace: true })
  }
  const changeDateFrom = (value: string) => {
    const next = new URLSearchParams(params)
    next.set('desde', value)
    if (value > dateTo) next.set('hasta', value)
    setParams(next, { replace: true })
    setAuditPage(1)
  }
  const changeDateTo = (value: string) => {
    changeParam('hasta', value)
    setAuditPage(1)
  }
  const loading =
    activeTab === 'operation'
      ? period.isPending || daily.isPending
      : activeTab === 'team'
        ? team.isPending
        : activeTab === 'audit'
          ? audit.isPending
          : period.isPending
  const failed =
    activeTab === 'operation'
      ? period.isError || daily.isError
      : activeTab === 'team'
        ? team.isError
        : activeTab === 'audit'
          ? audit.isError
          : period.isError
  const retry = () => {
    if (activeTab === 'operation') void Promise.all([period.refetch(), daily.refetch()])
    else if (activeTab === 'team') void team.refetch()
    else if (activeTab === 'audit') void audit.refetch()
    else void period.refetch()
  }
  const exportKind = activeTab === 'team' ? 'barbers' : 'period'
  const canExport = validRange && !failed && !loading

  if (session.isPending)
    return (
      <main className="mx-auto max-w-360 px-4 py-8" role="status">
        Cargando permisos…
      </main>
    )
  if (session.isError)
    return (
      <main className="mx-auto max-w-360 px-4 py-8">
        <p className={errorClassName} role="alert">
          No se pudo comprobar la sesión.{' '}
          <button className="font-bold underline" onClick={() => void session.refetch()}>
            Reintentar
          </button>
        </p>
      </main>
    )
  if (!isOwner) return <Navigate to="/app/acceso-denegado" replace />

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <header className="border-b border-lou-fog pb-7">
        <p className="mb-2 text-xs font-bold tracking-[0.2em] text-lou-graphite/50 uppercase">
          Gestión del dueño
        </p>
        <h1 className="m-0 font-display text-5xl leading-[0.9] font-bold sm:text-6xl">Reportes</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-lou-graphite/65">
          Comprueba cada cifra en su origen. Resultado, flujo de caja y deuda de comisión son cosas
          distintas.
        </p>
      </header>

      <section className={cn(panelClassName, 'mt-5')} aria-label="Período del reporte">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="grid gap-3 sm:grid-cols-2 lg:w-[28rem]">
            <label className={labelClassName}>
              Desde
              <input
                className={fieldClassName}
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(event) => changeDateFrom(event.target.value)}
              />
            </label>
            <label className={labelClassName}>
              Hasta
              <input
                className={fieldClassName}
                type="date"
                value={dateTo}
                min={dateFrom}
                max={addCalendarDays(dateFrom, 366)}
                onChange={(event) => changeDateTo(event.target.value)}
              />
            </label>
          </div>
          {activeTab !== 'operation' && activeTab !== 'team' ? (
            <p className="max-w-xs text-xs leading-5 text-lou-graphite/55">
              Este detalle se consulta aquí; el CSV disponible corresponde sólo a operaciones o
              producción del equipo.
            </p>
          ) : (
            <div className="text-left lg:text-right">
              {canExport ? (
                <a
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-lou-steel bg-white px-5 py-2.5 text-sm font-bold text-lou-ink shadow-lou-sm transition-[translate,background-color] duration-300 ease-lou hover:-translate-y-px hover:bg-lou-paper"
                  href={reportingApi.exportUrl(exportKind, dateFrom, dateTo)}
                  download
                >
                  <AppIcon name="arrow-right" size={17} />
                  Descargar {activeTab === 'team' ? 'producción' : 'operaciones'} CSV
                </a>
              ) : (
                <Button variant="secondary" disabled>
                  Descargar CSV
                </Button>
              )}
              <p className="mt-1 text-xs text-lou-graphite/50">
                CSV del {dateFrom} al {dateTo} · sólo datos del período
              </p>
            </div>
          )}
        </div>
        {!validRange && (
          <p className={cn('mt-4', errorClassName)} role="alert">
            Selecciona un rango válido de hasta 367 días.
          </p>
        )}
      </section>

      <div className="mt-5">
        <ReportTabs active={activeTab} onChange={(tab) => changeParam('vista', tab)} />
      </div>
      {!validRange ? null : loading ? (
        <ReportSkeleton />
      ) : failed ? (
        <div className={cn('mt-5', errorClassName)} role="alert">
          No se pudo cargar este reporte.{' '}
          <button className="font-bold underline" onClick={retry}>
            Reintentar
          </button>
        </div>
      ) : activeTab === 'operation' && period.data && daily.data ? (
        <OperationReport
          period={period.data}
          daily={daily.data}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      ) : activeTab === 'cash' && period.data ? (
        <CashReport period={period.data} />
      ) : activeTab === 'commissions' && period.data ? (
        <CommissionReport period={period.data} />
      ) : activeTab === 'team' && team.data ? (
        <TeamReport rows={team.data} />
      ) : activeTab === 'audit' && audit.data ? (
        <AuditReport
          data={audit.data}
          entityType={entityType}
          onEntityChange={(value) => {
            setEntityType(value)
            setAuditPage(1)
          }}
          onPageChange={setAuditPage}
        />
      ) : null}
    </main>
  )
}

const ReportSkeleton = () => (
  <section className="mt-6 space-y-4" role="status" aria-label="Cargando reporte">
    <div className="grid gap-3 sm:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div
          key={item}
          className="h-32 animate-pulse rounded-2xl border border-lou-fog bg-white p-5"
        >
          <div className="h-3 w-24 rounded bg-lou-fog" />
          <div className="mt-5 h-9 w-32 rounded bg-lou-fog" />
        </div>
      ))}
    </div>
    <div className="h-80 animate-pulse rounded-2xl border border-lou-fog bg-white p-5">
      <div className="h-6 w-44 rounded bg-lou-fog" />
      <div className="mt-8 h-4 w-full rounded bg-lou-fog" />
      <div className="mt-5 h-4 w-4/5 rounded bg-lou-fog" />
    </div>
  </section>
)
