import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import {
  comparisonRange,
  daysBetween,
  presetRange,
  type PeriodPreset,
} from '../../core/reporting/Reporting'
import { todayInBusinessTime } from '../../core/scheduling/Scheduling'
import { authApi } from '../../infrastructure/http/authApi'
import { reportingApi } from '../../infrastructure/http/reportingApi'
import { AppIcon } from '../components/AppIcon'
import { Button } from '../components/Button'
import { buttonStyles } from '../components/buttonStyles'
import { ActivityReport } from '../components/reports/ActivityReport'
import { MoneyReport } from '../components/reports/MoneyReport'
import { SummaryReport } from '../components/reports/SummaryReport'
import { TeamReport } from '../components/reports/TeamReport'
import { presetLabels, rangeText } from '../components/reports/reportText'
import { cn } from '../styles/cn'
import { errorClassName, fieldClassName, labelClassName } from '../styles/formStyles'

type Tab = 'summary' | 'money' | 'team' | 'activity'

const tabs: { id: Tab; param: string; label: string }[] = [
  { id: 'summary', param: 'resumen', label: 'Resumen' },
  { id: 'money', param: 'dinero', label: 'Dinero' },
  { id: 'team', param: 'equipo', label: 'Equipo' },
  { id: 'activity', param: 'actividad', label: 'Actividad' },
]
const presets: { id: PeriodPreset; param: string }[] = [
  { id: 'today', param: 'hoy' },
  { id: 'week', param: 'semana' },
  { id: 'month', param: 'mes' },
  { id: 'lastMonth', param: 'mes-pasado' },
]
const maxDays = 366

const validDate = (value: string | null): value is string =>
  Boolean(
    value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`)),
  )

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors duration-150',
    active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:border-line-control',
  )

export const ReportsPage = () => {
  const today = todayInBusinessTime()
  const [params, setParams] = useSearchParams()
  const tab = tabs.find((item) => item.param === params.get('vista'))?.id ?? 'summary'
  const custom = params.get('periodo') === 'fechas'
  const preset = custom
    ? undefined
    : (presets.find((item) => item.param === params.get('periodo'))?.id ?? 'month')
  const fallback = presetRange('month', today)
  const range = preset
    ? presetRange(preset, today)
    : {
        from: validDate(params.get('desde')) ? params.get('desde')! : fallback.from,
        to: validDate(params.get('hasta')) ? params.get('hasta')! : fallback.to,
      }
  const validRange = range.from <= range.to && daysBetween(range.from, range.to) <= maxDays
  const comparison = comparisonRange(range.from, range.to, preset)
  const [entityType, setEntityType] = useState('')
  const [auditPage, setAuditPage] = useState(1)

  const session = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.current,
    retry: false,
  })
  const isOwner = session.data?.roles.includes('OWNER') ?? false
  const ready = isOwner && validRange
  const period = useQuery({
    queryKey: ['reports', 'period', range.from, range.to],
    queryFn: () => reportingApi.period(range.from, range.to),
    enabled: ready && (tab === 'summary' || tab === 'money'),
  })
  const previous = useQuery({
    queryKey: ['reports', 'period', comparison.from, comparison.to],
    queryFn: () => reportingApi.period(comparison.from, comparison.to),
    enabled: ready && tab === 'summary',
  })
  const team = useQuery({
    queryKey: ['reports', 'barbers', range.from, range.to],
    queryFn: () => reportingApi.barbers(range.from, range.to),
    enabled: ready && tab === 'team',
  })
  const audit = useQuery({
    queryKey: ['reports', 'audit', range.from, range.to, entityType, auditPage],
    queryFn: () => reportingApi.audit(range.from, range.to, entityType, auditPage),
    enabled: ready && tab === 'activity',
  })

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) next.set(key, value)
    setParams(next, { replace: true })
    setAuditPage(1)
  }
  const choosePreset = (value: PeriodPreset) => {
    const next = new URLSearchParams(params)
    next.set('periodo', presets.find((item) => item.id === value)!.param)
    next.delete('desde')
    next.delete('hasta')
    setParams(next, { replace: true })
    setAuditPage(1)
  }

  const current = tab === 'team' ? team : tab === 'activity' ? audit : period
  const retry = () => void current.refetch()
  const exportKind = tab === 'team' ? 'barbers' : 'period'

  if (session.isPending)
    return (
      <main
        className="mx-auto w-full max-w-360 px-4 py-6"
        role="status"
        aria-label="Cargando reportes"
      >
        <div className="h-96 animate-pulse rounded-panel bg-surface-strong" />
      </main>
    )
  if (session.isError)
    return (
      <main className="mx-auto w-full max-w-360 px-4 py-6">
        <div
          className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
          role="alert"
        >
          No pudimos comprobar tu sesión.
          <Button variant="secondary" size="sm" onClick={() => void session.refetch()}>
            Reintentar
          </Button>
        </div>
      </main>
    )
  if (!isOwner) return <Navigate to="/app/acceso-denegado" replace />

  return (
    <main className="mx-auto w-full max-w-360 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-5xl leading-none font-extrabold text-balance sm:text-6xl">
            Reportes
          </h1>
          <p className="mt-2 text-lg text-pretty text-ink-soft">
            {validRange ? `Del ${rangeText(range.from, range.to)}.` : 'Elige un periodo válido.'}
          </p>
        </div>
        {tab !== 'activity' && validRange && (
          <a
            className={cn(buttonStyles({ variant: 'secondary' }), 'max-sm:w-full')}
            href={reportingApi.exportUrl(exportKind, range.from, range.to)}
            download
          >
            <AppIcon name="arrow-right" size={18} />
            Descargar CSV
          </a>
        )}
      </header>

      <div className="mt-5 grid gap-3">
        <div
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          role="group"
          aria-label="Periodo"
        >
          {presets.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={preset === item.id}
              className={chipClassName(preset === item.id)}
              onClick={() => choosePreset(item.id)}
            >
              {presetLabels[item.id]}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={custom}
            className={chipClassName(custom)}
            onClick={() => update({ periodo: 'fechas', desde: range.from, hasta: range.to })}
          >
            <AppIcon name="calendar" size={18} />
            Elegir fechas
          </button>
        </div>
        {custom && (
          <div className="grid gap-3 rounded-panel bg-surface p-4 shadow-raised sm:max-w-xl sm:grid-cols-2">
            <label className={labelClassName}>
              Desde
              <input
                className={fieldClassName}
                type="date"
                name="report-from"
                value={range.from}
                max={today}
                onChange={(event) =>
                  event.target.value &&
                  update({
                    desde: event.target.value,
                    ...(event.target.value > range.to ? { hasta: event.target.value } : {}),
                  })
                }
              />
            </label>
            <label className={labelClassName}>
              Hasta
              <input
                className={fieldClassName}
                type="date"
                name="report-to"
                value={range.to}
                min={range.from}
                onChange={(event) => event.target.value && update({ hasta: event.target.value })}
              />
            </label>
          </div>
        )}
        {!validRange && (
          <p className={errorClassName} role="alert">
            El periodo puede ser de hasta un año, con la fecha de inicio antes que la final.
          </p>
        )}
      </div>

      <div
        className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        role="tablist"
        aria-label="Secciones del reporte"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`report-tab-${item.id}`}
            aria-controls={`report-panel-${item.id}`}
            aria-selected={tab === item.id}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 font-semibold transition-colors duration-150',
              tab === item.id
                ? 'border-ink bg-ink text-on-ink'
                : 'border-transparent bg-surface shadow-raised hover:border-line-control',
            )}
            onClick={() => update({ vista: item.param })}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section
        id={`report-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`report-tab-${tab}`}
        className="mt-4"
      >
        {!validRange ? null : current.isPending ? (
          <div
            className="h-96 animate-pulse rounded-panel bg-surface-strong"
            role="status"
            aria-label="Cargando reporte"
          />
        ) : current.isError ? (
          <div
            className={cn(errorClassName, 'flex flex-wrap items-center justify-between gap-3')}
            role="alert"
          >
            No pudimos cargar este reporte.
            <Button variant="secondary" size="sm" onClick={retry}>
              Reintentar
            </Button>
          </div>
        ) : tab === 'summary' && period.data ? (
          <SummaryReport period={period.data} previous={previous.data} comparison={comparison} />
        ) : tab === 'money' && period.data ? (
          <MoneyReport period={period.data} />
        ) : tab === 'team' && team.data ? (
          <TeamReport rows={team.data} />
        ) : tab === 'activity' && audit.data ? (
          <ActivityReport
            data={audit.data}
            entityType={entityType}
            onEntityChange={(value) => {
              setEntityType(value)
              setAuditPage(1)
            }}
            onPageChange={setAuditPage}
          />
        ) : null}
      </section>
    </main>
  )
}
