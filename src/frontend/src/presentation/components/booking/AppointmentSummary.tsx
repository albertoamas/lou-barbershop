import { centsToBolivianos } from '../../../core/configuration/Configuration'
import { AppIcon, type IconName } from '../AppIcon'
import { bookingDateTime } from './bookingFormat'
import { serviceIcon } from '../public/serviceIcon'

interface SummaryAppointment {
  serviceName: string
  barberName: string
  startsAt: string
  durationMinutes: number
  priceCents: number
}

const Row = ({ icon, label, value }: { icon: IconName; label: string; value: string }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-full bg-paper-warm text-ink">
      <AppIcon name={icon} size={20} />
    </span>
    <div className="min-w-0">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="font-semibold text-pretty">{value}</dd>
    </div>
  </div>
)

// A booked appointment as the customer sees it, after booking and in "Mi cita".
export const AppointmentSummary = ({ appointment }: { appointment: SummaryAppointment }) => (
  <dl className="mt-6 grid gap-4 rounded-sheet bg-surface p-5 text-left shadow-raised sm:grid-cols-2 sm:p-6">
    <Row
      icon={serviceIcon(appointment.serviceName)}
      label="Servicio"
      value={appointment.serviceName}
    />
    <Row icon="scissors" label="Barbero" value={appointment.barberName} />
    <Row icon="calendar" label="Día y hora" value={bookingDateTime(appointment.startsAt)} />
    <Row
      icon="clock"
      label="Duración y precio"
      value={`${appointment.durationMinutes} min, ${centsToBolivianos(appointment.priceCents)}`}
    />
  </dl>
)
