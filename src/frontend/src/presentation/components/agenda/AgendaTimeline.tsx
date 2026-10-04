import { useEffect, useRef } from 'react'
import { overlapsAnotherAppointment, type Appointment } from '../../../core/agenda/Agenda'
import {
  formatMinutes,
  middayClosure,
  timelineEndMinutes,
  timelineHours,
  timelineSlot,
  timelineStartMinutes,
} from '../../../core/agenda/AgendaTimeline'
import { Avatar } from '../Avatar'
import { AppointmentBlock } from './AppointmentBlock'

// 120 px per hour: readable at arm's length on a tablet. Blocks never draw shorter than
// the 44 px touch target (plan section 6.2), even for a 15 minute service.
const pixelsPerMinute = 2
const minimumBlockHeight = 44
const px = (minutes: number) => `${minutes * pixelsPerMinute}px`
const dayHeight = px(timelineEndMinutes - timelineStartMinutes)

export interface AgendaColumn {
  id: string
  name: string
  appointments: Appointment[]
}

interface AgendaTimelineProps {
  columns: AgendaColumn[]
  allAppointments: Appointment[]
  // Current time when the day shown is today: offset from the timeline start and label.
  now?: { offset: number; label: string } | undefined
  selectedId?: string | undefined
  onOpen: (appointment: Appointment) => void
}

const countLabel = (count: number) =>
  count === 0 ? 'Sin citas' : count === 1 ? '1 cita' : `${count} citas`

export const AgendaTimeline = ({
  columns,
  allAppointments,
  now,
  selectedId,
  onOpen,
}: AgendaTimelineProps) => {
  const nowMarker = useRef<HTMLSpanElement>(null)
  const scrolled = useRef(false)
  const showsNow = now !== undefined

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
      <div className="flex min-w-max">
        <div className="w-14 shrink-0 border-r border-surface-muted" aria-hidden="true">
          <div className="h-16 border-b border-surface-muted" />
          <div className="relative" style={{ height: dayHeight }}>
            {timelineHours().map((minutes) => (
              <span
                key={minutes}
                className="absolute right-2 -translate-y-1/2 text-sm text-ink-muted tabular-nums first:translate-y-0"
                style={{ top: px(minutes - timelineStartMinutes) }}
              >
                {formatMinutes(minutes)}
              </span>
            ))}
            {now && (
              <span
                ref={nowMarker}
                className="absolute right-1 z-10 -translate-y-1/2 rounded-full bg-ink px-1.5 text-sm font-semibold text-on-ink tabular-nums"
                style={{ top: px(now.offset) }}
              >
                {now.label}
              </span>
            )}
          </div>
        </div>

        {columns.map((column) => (
          <section
            key={column.id}
            className="min-w-34 flex-1 border-r border-surface-muted last:border-r-0"
            aria-label={`Agenda de ${column.name}`}
          >
            <header className="flex h-16 items-center gap-3 border-b border-surface-muted px-3">
              <Avatar name={column.name} size="sm" tone="ink" />
              <span className="min-w-0">
                <span className="block truncate font-semibold">{column.name}</span>
                <span className="block text-sm text-ink-muted">
                  {countLabel(column.appointments.length)}
                </span>
              </span>
            </header>
            <div className="relative" style={{ height: dayHeight }}>
              {timelineHours().map((minutes) => (
                <div
                  key={minutes}
                  aria-hidden="true"
                  className="absolute inset-x-0 border-t border-surface-muted"
                  style={{ top: px(minutes - timelineStartMinutes) }}
                />
              ))}
              <div
                className="absolute inset-x-0 grid place-items-center bg-surface-muted text-sm text-ink-muted"
                style={{
                  top: px(middayClosure.startMinutes - timelineStartMinutes),
                  height: px(middayClosure.endMinutes - middayClosure.startMinutes),
                }}
              >
                Cerrado de {formatMinutes(middayClosure.startMinutes)} a{' '}
                {formatMinutes(middayClosure.endMinutes)}
              </div>
              {column.appointments.map((appointment) => {
                const slot = timelineSlot(appointment)
                return (
                  <AppointmentBlock
                    key={appointment.id}
                    appointment={appointment}
                    selected={appointment.id === selectedId}
                    overlap={overlapsAnotherAppointment(appointment, allAppointments)}
                    density={slot.length >= 60 ? 'full' : slot.length >= 40 ? 'medium' : 'small'}
                    className="absolute inset-x-1.5 w-auto"
                    style={{
                      top: px(slot.offset),
                      height: `${Math.max(slot.length * pixelsPerMinute, minimumBlockHeight)}px`,
                    }}
                    onOpen={() => onOpen(appointment)}
                  />
                )
              })}
              {now && (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-ink"
                  style={{ top: px(now.offset) }}
                />
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
