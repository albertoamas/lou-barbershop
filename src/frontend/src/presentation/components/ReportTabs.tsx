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
  <div className="report-tabs" aria-label="Secciones del reporte" role="tablist">
    {tabs.map(({ id, label }) => (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active === id}
        onClick={() => onChange(id)}
      >
        {label}
      </button>
    ))}
  </div>
)
