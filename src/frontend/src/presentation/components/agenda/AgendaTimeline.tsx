import { useEffect, useRef, type ReactNode } from 'react'
import { overlapsAnotherAppointment, type Appointment } from '../../../core/agenda/Agenda'
import {
  formatMinutes,
  halfHourSlots,
  isMiddayClosure,
  middayClosure,
  timelineEndMinutes,
  timelineHours,
  timelineLanes,
  timelineSlot,
  timelineStartMinutes,
} from '../../../core/agenda/AgendaTimeline'
import { cn } from '../../styles/cn'
import { AppIcon } from '../AppIcon'
import { Avatar } from '../Avatar'
import { AppointmentBlock } from './AppointmentBlock'

// 60 px per half hour: every bookable half hour is a comfortable touch target and blocks
// never draw shorter than 44 px (plan section 6.2), even for a 15 minute service.
const pixelsPerMinute = 2
const minimumBlockHeight = 44
const px = (minutes: number) => `${minutes * pixelsPerMinute}px`
const dayHeight = px(timelineEndMinutes - timelineStartMinutes)

export interface AgendaColumn {
  id: string
  // Accessible name of the column region.
  label: string
  header: ReactNode
  appointments: Appointment[]
  isToday: boolean
  // Booking from an empty half hour, as in a calendar app. Absent when the column cannot
  // take new appointments (no permission, offline or a past day).
  create?:
    | {
        // Half hours that start before this minute of the day are already gone.
        fromMinutes: number
        label: (time: string) => string
        onSelect: (time: string) => void
      }
    | undefined
}

interface AgendaTimelineProps {
  columns: AgendaColumn[]
  allAppointments: Appointment[]
  // Current time when today is shown: offset from the timeline start and label.
  now?: { offset: number; label: string } | undefined
  selectedId?: string | undefined
  showBarber?: boolean
  // Narrow day columns for the week; barber columns keep a readable minimum width.
  compact?: boolean
  onOpen: (appointment: Appointment) => void
}

const countLabel = (count: number) =>
  count === 0 ? 'Sin citas' : count === 1 ? '1 cita' : `${count} citas`

export const BarberColumnHeader = ({ name, count }: { name: string; count: number }) => (
  <span className="flex min-w-0 items-center gap-3 px-3">
    <Avatar name={name} size="sm" tone="ink" />
    <span className="min-w-0">
      <span className="block truncate font-semibold">{name}</span>
      <span className="block text-sm text-ink-muted">{countLabel(count)}</span>
    </span>
  </span>
)

// Weekday over the day number, today circled, as calendar apps label their columns.
export const DayColumnHeader = ({
  weekday,
  day,
  isToday,
}: {
  weekday: string
  day: number
  isToday: boolean
}) => (
  <span className="flex flex-col items-center gap-0.5">
    <span
      className={cn('text-sm first-letter:uppercase', isToday ? 'font-semibold' : 'text-ink-muted')}
    >
      {weekday}
    </span>
    <span
      className={cn(
        'grid size-9 place-items-center rounded-full font-display text-xl leading-none font-extrabold tabular-nums',
        isToday && 'bg-ink text-on-ink',
      )}
    >
      {day}
    </span>
  </span>
)

export const AgendaTimeline = ({
  columns,
  allAppointments,
  now,
  selectedId,
  showBarber = false,
  compact = false,
  onOpen,
}: AgendaTimelineProps) => {
  const nowMarker = useRef<HTMLSpanElement>(null)
  const scrolled = useRef(false)
  const showsNow = now !== undefined && columns.some((column) => column.isToday)

  // Bring the current time into view once when today's agenda opens.
  useEffect(() => {
    if (!showsNow || scrolled.current) return
    scrolled.current = true
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    nowMarker.current?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
  }, [showsNow])

  return (
    <div className="overflow-x-auto rounded-panel bg-surface shadow-raised">
      <div className={cn('flex', !compact && 'min-w-max')}>
        <div className="w-14 shrink-0" aria-hidden="true">
          <div className="h-16 border-b border-surface-strong" />
          <div className="relative" style={{ height: dayHeight }}>
            {timelineHours().map((minutes) => (
              <span
                key={minutes}
                className="absolute right-2 -translate-y-1/2 text-sm text-ink-muted tabular-nums first:translate-y-1"
                style={{ top: px(minutes - timelineStartMinutes) }}
              >
                {formatMinutes(minutes)}
              </span>
            ))}
            {showsNow && now && (
              <span
                ref={nowMarker}
                className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-danger px-1.5 text-sm font-semibold text-on-ink tabular-nums"
                style={{ top: px(now.offset) }}
              >
                {now.label}
              </span>
            )}
          </div>
        </div>

        {columns.map((column) => {
          const lanes = timelineLanes(column.appointments)
          return (
            <section
              key={column.id}
              className={cn(
                'min-w-0 flex-1 border-l border-surface-strong',
                compact ? 'min-w-18' : 'min-w-34',
              )}
              aria-label={column.label}
            >
              <header className="flex h-16 items-center justify-center border-b border-surface-strong">
                {column.header}
              </header>
              <div className="relative" style={{ height: dayHeight }}>
                {halfHourSlots().map((minutes) => (
                  <div
                    key={minutes}
                    aria-hidden="true"
                    className={cn(
                      'absolute inset-x-0 border-t',
                      minutes % 60 === 0
                        ? 'border-surface-strong'
                        : 'border-dashed border-surface-strong/70',
                    )}
                    style={{ top: px(minutes - timelineStartMinutes) }}
                  />
                ))}
                <div
                  className="absolute inset-x-0 grid place-items-center bg-surface-muted px-2 text-center text-sm text-ink-muted"
                  style={{
                    top: px(middayClosure.startMinutes - timelineStartMinutes),
                    height: px(middayClosure.endMinutes - middayClosure.startMinutes),
                  }}
                >
                  {compact
                    ? 'Cerrado'
                    : `Cerrado de ${formatMinutes(middayClosure.startMinutes)} a ${formatMinutes(middayClosure.endMinutes)}`}
                </div>
                {column.create &&
                  halfHourSlots()
                    .filter(
                      (minutes) =>
                        !isMiddayClosure(minutes) && minutes >= (column.create?.fromMinutes ?? 0),
                    )
                    .map((minutes) => {
                      const time = formatMinutes(minutes)
                      return (
                        // Pointer shortcut: keyboard and screen reader users book with the
                        // "Nueva cita" button, so these half hours stay out of the tab order.
                        <button
                          key={minutes}
                          type="button"
                          tabIndex={-1}
                          aria-label={column.create?.label(time)}
                          className="group absolute inset-x-0 flex items-start gap-1 px-2 pt-1.5 text-sm font-semibold text-transparent transition-colors duration-100 hover:bg-surface-muted hover:text-ink-soft active:bg-surface-strong"
                          style={{ top: px(minutes - timelineStartMinutes), height: px(30) }}
                          onClick={() => column.create?.onSelect(time)}
                        >
                          <AppIcon name="plus" size={16} />
                          <span className="tabular-nums">{time}</span>
                        </button>
                      )
                    })}
                {column.appointments.map((appointment) => {
                  const slot = timelineSlot(appointment)
                  const lane = lanes.get(appointment.id) ?? { lane: 0, lanes: 1 }
                  const width = 100 / lane.lanes
                  return (
                    <AppointmentBlock
                      key={appointment.id}
                      appointment={appointment}
                      selected={appointment.id === selectedId}
                      overlap={overlapsAnotherAppointment(appointment, allAppointments)}
                      showBarber={showBarber}
                      compact={compact}
                      density={slot.length >= 60 ? 'full' : slot.length >= 30 ? 'medium' : 'small'}
                      className="absolute z-10"
                      style={{
                        top: `calc(${px(slot.offset)} + 1px)`,
                        height: `${Math.max(slot.length * pixelsPerMinute, minimumBlockHeight) - 2}px`,
                        // A gap on the trailing side leaves room to tap the empty half hour.
                        left: `calc(${lane.lane * width}% + 3px)`,
                        width: `calc(${width}% - ${lane.lanes > 1 ? 5 : compact ? 7 : 12}px)`,
                      }}
                      onOpen={() => onOpen(appointment)}
                    />
                  )
                })}
                {column.isToday && showsNow && now && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 z-20 h-0.5 bg-danger"
                    style={{ top: px(now.offset) }}
                  >
                    <span className="absolute -top-1 -left-1.5 size-2.5 rounded-full bg-danger" />
                  </div>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
