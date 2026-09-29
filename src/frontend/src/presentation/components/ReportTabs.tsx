export type ReportTab = 'operation' | 'cash' | 'commissions' | 'team' | 'audit'

interface ReportTabsProps {
  active: ReportTab
  onChange: (tab: ReportTab) => void
}

const tabs: ReadonlyArray<{ id: ReportTab; label: string }> = [
  { id: 'operation', label: 'Operación' },
  { id: 'cash', label: 'Caja' },
  { id: 'commissions', label: 'Comisiones' },
  { id: 'team', label: 'Equipo' },
  { id: 'audit', label: 'Auditoría' },
]

export const ReportTabs = ({ active, onChange }: ReportTabsProps) => (
  <div
    className="sticky top-0 z-10 border-b border-lou-fog bg-lou-paper/95 py-2 backdrop-blur-sm"
    aria-label="Secciones del reporte"
    role="tablist"
  >
    <div className="grid grid-cols-3 gap-1 sm:flex">
      {tabs.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`report-tab-${id}`}
          aria-controls={`report-panel-${id}`}
          aria-selected={active === id}
          className={`min-h-11 rounded-xl px-2 text-xs font-bold transition-colors duration-200 sm:px-4 sm:text-sm ${active === id ? 'bg-lou-ink text-white' : 'text-lou-graphite/60 hover:bg-white hover:text-lou-ink'}`}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  </div>
)
