import type { CSSProperties } from 'react'
import { agendaTime, statusLabels, type Appointment } from '../../../core/agenda/Agenda'
import { timeRangeLabel } from '../../../core/agenda/AgendaTimeline'
import { cn } from '../../styles/cn'
import { AppIcon, type IconName } from '../AppIcon'
import { Stripes } from '../Stripes'
import { statusBlockClassName } from './appointmentStatusStyles'

// Icon companion for the state, so short blocks still show it without color alone.
const statusIcons: Partial<Record<Appointment['status'], IconName>> = {
  CHECKED_IN: 'clock',
  COMPLETED: 'check',
  CANCELLED: 'close',
  NO_SHOW: 'close',
}

const StatusIcon = ({ status, size = 16 }: { status: Appointment['status']; size?: number }) => {
  const icon = statusIcons[status]
  return icon ? <AppIcon name={icon} size={size} /> : null
}

const isInactive = (status: Appointment['status']) => status === 'CANCELLED' || status === 'NO_SHOW'

interface AppointmentBlockProps {
  appointment: Appointment
  selected?: boolean
  overlap?: boolean
  // How much fits, as in a calendar app: full (an hour or more: name, time, service and
  // state), medium (30 to 59 minutes: name and time) and small (one line).
  density?: 'full' | 'medium' | 'small'
  showBarber?: boolean
  // Narrow week columns: the start time and state icon under the name, the rest read
  // only by assistive technology.
  compact?: boolean
  className?: string
  style?: CSSProperties
  onOpen: () => void
}

export const AppointmentBlock = ({
  appointment,
  selected = false,
  overlap = false,
  density = 'full',
  showBarber = false,
  compact = false,
  className,
  style,
  onOpen,
}: AppointmentBlockProps) => (
  <button
    type="button"
    className={cn(
      'relative flex w-full min-w-0 scroll-mt-28 flex-col items-start overflow-hidden rounded-lg py-1.5 text-left text-sm leading-snug transition-shadow duration-150 hover:shadow-floating',
      compact ? 'px-1.5' : 'px-2.5',
      statusBlockClassName[appointment.status],
      appointment.status === 'IN_SERVICE' && 'pt-3',
      overlap && 'outline-2 outline-offset-1 outline-danger outline-dashed',
      selected && 'z-20 shadow-floating ring-2 ring-ink ring-offset-2 ring-offset-surface',
      className,
    )}
    style={style}
    aria-current={selected ? 'true' : undefined}
    onClick={onOpen}
  >
    {appointment.status === 'IN_SERVICE' && (
      <Stripes density="fine" className="absolute inset-x-0 top-0 h-1.5" />
    )}
    {compact ? (
      <>
        <strong
          className={cn(
            'w-full min-w-0 truncate font-semibold',
            isInactive(appointment.status) && 'line-through decoration-1',
          )}
        >
          {appointment.customerName}
        </strong>
        {density !== 'small' && (
          <span className="flex w-full flex-wrap items-center justify-between gap-x-0.5 tabular-nums">
            {agendaTime(appointment.startsAt)}
            <StatusIcon status={appointment.status} size={14} />
          </span>
        )}
        <span className="sr-only">
          , {timeRangeLabel(appointment)}, {appointment.serviceName},{' '}
          {statusLabels[appointment.status]}
          {overlap && ', horario superpuesto'}
        </span>
      </>
    ) : (
      <>
        <span className="flex w-full items-center justify-between gap-1.5">
          <strong
            className={cn(
              'min-w-0 truncate font-semibold',
              isInactive(appointment.status) && 'line-through decoration-1',
            )}
          >
            {appointment.customerName}
            {density === 'small' && (
              <span className="font-normal">, {agendaTime(appointment.startsAt)}</span>
            )}
          </strong>
          <span className="shrink-0">
            <StatusIcon status={appointment.status} />
          </span>
        </span>
        {density !== 'small' && (
          <span className="truncate tabular-nums">{timeRangeLabel(appointment)}</span>
        )}
        {density === 'full' && (
          <>
            <span className="truncate opacity-80">{appointment.serviceName}</span>
            {showBarber && (
              <span className="truncate opacity-80">con {appointment.barberName}</span>
            )}
            <span className="mt-auto truncate pt-0.5 font-semibold">
              {statusLabels[appointment.status]}
            </span>
          </>
        )}
        {density !== 'full' && <span className="sr-only">{statusLabels[appointment.status]}</span>}
        {overlap && (
          <span className={cn('font-semibold', density !== 'full' && 'sr-only')}>
            Horario superpuesto
          </span>
        )}
      </>
    )}
  </button>
)
