import {
  activityFilters,
  activitySentence,
  type AuditPage,
} from '../../../core/reporting/Reporting'
import { cn } from '../../styles/cn'
import { AppIcon } from '../AppIcon'
import { Button } from '../Button'
import { Empty, ReportCard } from './ReportParts'
import { dateTimeText, plural } from './reportText'

const chipClassName = (active: boolean) =>
  cn(
    'inline-flex min-h-11 shrink-0 items-center rounded-full border-2 px-4 font-semibold transition-colors duration-150',
    active ? 'border-ink bg-ink text-on-ink' : 'border-line bg-surface hover:border-line-control',
  )

export const ActivityReport = ({
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
    <ReportCard id="report-activity" title="Quién hizo qué">
      <div
        className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:px-6"
        role="group"
        aria-label="Filtrar actividad"
      >
        {activityFilters.map(([value, label]) => (
          <button
            key={value || 'all'}
            type="button"
            aria-pressed={entityType === value}
            className={chipClassName(entityType === value)}
            onClick={() => onEntityChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="mt-3 text-ink-soft">
        {plural(data.total, 'cambio registrado', 'cambios registrados')} en el periodo.
      </p>
      {data.items.length ? (
        <ul className="mt-2 divide-y divide-surface-strong">
          {data.items.map((row) => {
            const { who, what } = activitySentence(row)
            return (
              <li key={row.id} className="py-3">
                <details className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-pretty">
                        <strong>{who}</strong> {what}
                      </span>
                      <span className="block text-ink-soft">{dateTimeText(row.createdAt)}</span>
                    </span>
                    <span className="mt-1 shrink-0 text-ink-soft transition-transform duration-150 group-open:rotate-180">
                      <AppIcon name="chevron-down" size={18} />
                    </span>
                  </summary>
                  <div className="mt-3 grid gap-3 rounded-control bg-surface-muted p-3 text-sm">
                    <p>
                      Datos técnicos: {row.action}, {row.entityType},{' '}
                      <code className="break-all">{row.entityId}</code>
                    </p>
                    {row.beforeData && (
                      <div>
                        <p className="font-semibold">Antes</p>
                        <pre
                          className="mt-1 max-h-64 overflow-auto rounded-control bg-surface p-3 break-all whitespace-pre-wrap"
                          aria-label="Estado anterior"
                        >
                          {row.beforeData}
                        </pre>
                      </div>
                    )}
                    {row.afterData && (
                      <div>
                        <p className="font-semibold">Después</p>
                        <pre
                          className="mt-1 max-h-64 overflow-auto rounded-control bg-surface p-3 break-all whitespace-pre-wrap"
                          aria-label="Estado posterior"
                        >
                          {row.afterData}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-3">
          <Empty>No hay cambios con este filtro.</Empty>
        </div>
      )}
      {pages > 1 && (
        <nav
          className="mt-4 flex flex-wrap items-center justify-between gap-3"
          aria-label="Páginas de actividad"
        >
          <Button
            variant="secondary"
            disabled={data.page <= 1}
            onClick={() => onPageChange(data.page - 1)}
          >
            Anterior
          </Button>
          <span className="font-semibold">
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
    </ReportCard>
  )
}
