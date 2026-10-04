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

const StatusIcon = ({ status }: { status: Appointment['status'] }) => {
  const icon = statusIcons[status]
  return icon ? <AppIcon name={icon} size={16} /> : null
}

interface AppointmentBlockProps {
  appointment: Appointment
  selected?: boolean
  overlap?: boolean
  // How much fits: full (an hour or more on the timeline), medium (40 to 59 minutes:
  // name and one line), small (under 40 minutes: name and start time).
  density?: 'full' | 'medium' | 'small'
  showBarber?: boolean
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
  className,
  style,
  onOpen,
}: AppointmentBlockProps) => (
  <button
    type="button"
    className={cn(
      'relative flex w-full min-w-0 scroll-mt-28 flex-col items-start overflow-hidden rounded-control px-3 py-2 text-left text-sm transition-[box-shadow,translate] duration-150 hover:-translate-y-px hover:shadow-floating',
      statusBlockClassName[appointment.status],
      appointment.status === 'IN_SERVICE' && 'pt-4',
      overlap && 'outline-2 outline-offset-2 outline-danger outline-dashed',
      selected && 'shadow-floating ring-3 ring-ink ring-offset-2 ring-offset-canvas',
      className,
    )}
    style={style}
    aria-current={selected ? 'true' : undefined}
    onClick={onOpen}
  >
    {appointment.status === 'IN_SERVICE' && (
      <Stripes density="fine" className="absolute inset-x-0 top-0 h-2" />
    )}
    <span className="flex w-full items-baseline justify-between gap-2">
      <strong className="truncate font-semibold">{appointment.customerName}</strong>
      {density === 'small' && (
        <span className="shrink-0 tabular-nums">{agendaTime(appointment.startsAt)}</span>
      )}
    </span>
    {density === 'full' && (
      <>
        <span className="truncate opacity-85">{appointment.serviceName}</span>
        {showBarber && <span className="truncate opacity-85">con {appointment.barberName}</span>}
      </>
    )}
    {density === 'full' && (
      <span className="mt-auto flex w-full flex-col pt-1">
        <span className="tabular-nums">{timeRangeLabel(appointment)}</span>
        <span className="inline-flex items-center gap-1 font-semibold">
          <StatusIcon status={appointment.status} />
          {statusLabels[appointment.status]}
        </span>
      </span>
    )}
    {density === 'medium' && (
      <span className="mt-auto flex w-full items-center justify-between gap-2 pt-1">
        <span className="tabular-nums">{timeRangeLabel(appointment)}</span>
        <StatusIcon status={appointment.status} />
      </span>
    )}
    {density !== 'full' && <span className="sr-only">{statusLabels[appointment.status]}</span>}
    {overlap && <span className="mt-1 font-semibold text-danger-ink">Horario superpuesto</span>}
  </button>
)
