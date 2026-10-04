import { Link } from 'react-router-dom'
import { agendaTime, statusLabels, type AppointmentStatus } from '../../../core/agenda/Agenda'
import type { DashboardAppointment } from '../../../core/dashboard/Dashboard'
import { Avatar } from '../Avatar'
import { StatusBadge } from '../StatusBadge'
import { statusBadgeTone } from '../agenda/appointmentStatusStyles'

interface VisitListProps {
  appointments: DashboardAppointment[]
  // Reception sees who attends each one; a barber only sees their own.
  showBarber: boolean
  empty: string
  // Agenda day the rows open.
  date: string
}

const isStatus = (value: string): value is AppointmentStatus => value in statusLabels

export const VisitList = ({ appointments, showBarber, empty, date }: VisitListProps) =>
  appointments.length === 0 ? (
    <p className="rounded-control bg-surface-muted p-4 text-ink-soft">{empty}</p>
  ) : (
    <ul className="grid gap-2">
      {appointments.map((item) => (
        <li key={item.id}>
          <Link
            className="flex min-h-16 items-center gap-3 rounded-control px-3 py-2 transition-colors duration-150 hover:bg-surface-muted"
            to={`/app/agenda?fecha=${date}`}
          >
            <time
              className="w-14 shrink-0 font-display text-xl font-extrabold tabular-nums"
              dateTime={item.startsAt}
            >
              {agendaTime(item.startsAt)}
            </time>
            <Avatar name={item.customerName} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{item.customerName}</span>
              <span className="block truncate text-sm text-ink-soft">
                {showBarber ? `${item.serviceName}, con ${item.barberName}` : item.serviceName}
              </span>
            </span>
            {isStatus(item.status) && (
              <StatusBadge tone={statusBadgeTone[item.status]} className="max-sm:hidden">
                {statusLabels[item.status]}
              </StatusBadge>
            )}
          </Link>
        </li>
      ))}
    </ul>
  )
