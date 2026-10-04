import {
  pastShifts,
  shiftNote,
  shiftsOn,
  timeRangeText,
} from '../../../core/scheduling/Availability'
import { weekdayLabels, type WorkingSchedule } from '../../../core/scheduling/Scheduling'
import { cn } from '../../styles/cn'
import { AppIcon } from '../AppIcon'

interface WeeklyScheduleProps {
  schedules: WorkingSchedule[]
  today: string
  canManage: boolean
  disabled: boolean
  onEdit: (schedule: WorkingSchedule) => void
  onAdd: (weekday: number) => void
}

const ShiftPill = ({
  schedule,
  today,
  onEdit,
}: {
  schedule: WorkingSchedule
  today: string
  onEdit?: (() => void) | undefined
}) => {
  const note = shiftNote(schedule, today)
  const content = (
    <>
      <span className="font-semibold whitespace-nowrap tabular-nums">
        {timeRangeText(schedule.startLocalTime, schedule.endLocalTime)}
      </span>
      {note && <span className="text-sm text-ink-soft">{note}</span>}
    </>
  )
  const className =
    'inline-flex min-h-11 flex-col justify-center rounded-control bg-surface-muted px-4 py-1.5 text-left'
  return onEdit ? (
    <button
      type="button"
      className={cn(className, 'transition-colors duration-150 hover:bg-ink hover:text-on-ink')}
      aria-label={`Editar turno ${timeRangeText(schedule.startLocalTime, schedule.endLocalTime)}`}
      onClick={onEdit}
    >
      {content}
    </button>
  ) : (
    <span className={className}>{content}</span>
  )
}

// The fixed weekly shifts, one row per day. Managers tap a shift to edit it.
export const WeeklySchedule = ({
  schedules,
  today,
  canManage,
  disabled,
  onEdit,
  onAdd,
}: WeeklyScheduleProps) => {
  const history = pastShifts(schedules, today)
  return (
    <div>
      <ul className="divide-y divide-surface-strong">
        {weekdayLabels.map((label, index) => {
          const weekday = index + 1
          const shifts = shiftsOn(schedules, weekday, today)
          return (
            <li key={label} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="w-22 shrink-0 font-display text-xl font-extrabold sm:w-24">
                {label}
              </span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                {shifts.length === 0 && <span className="text-ink-soft">Libre</span>}
                {shifts.map((schedule) => (
                  <ShiftPill
                    key={schedule.id}
                    schedule={schedule}
                    today={today}
                    onEdit={canManage && !disabled ? () => onEdit(schedule) : undefined}
                  />
                ))}
              </div>
              {canManage && (
                <button
                  type="button"
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-control px-3 font-semibold hover:bg-surface-muted disabled:opacity-50"
                  disabled={disabled}
                  aria-label={`Agregar turno el ${label.toLowerCase()}`}
                  onClick={() => onAdd(weekday)}
                >
                  <AppIcon name="plus" size={18} />
                  <span className="max-sm:sr-only">Agregar</span>
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {history.length > 0 && (
        <details className="mt-3 rounded-control bg-surface-muted">
          <summary className="flex min-h-12 cursor-pointer items-center px-4 font-semibold">
            Turnos anteriores o inactivos ({history.length})
          </summary>
          <ul className="flex flex-wrap gap-2 px-4 pb-4">
            {history.map((schedule) => (
              <li key={schedule.id} className="flex items-center gap-2">
                <span className="text-ink-soft">{weekdayLabels[schedule.weekday - 1]}</span>
                <ShiftPill
                  schedule={schedule}
                  today={today}
                  onEdit={canManage && !disabled ? () => onEdit(schedule) : undefined}
                />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
