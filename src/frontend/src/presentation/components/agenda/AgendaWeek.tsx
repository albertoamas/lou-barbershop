import {
  appointmentsForDate,
  overlapsAnotherAppointment,
  type Appointment,
} from '../../../core/agenda/Agenda'
import { cn } from '../../styles/cn'
import { AppointmentBlock } from './AppointmentBlock'

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${date}T12:00:00Z`))

interface AgendaWeekProps {
  dates: string[]
  today: string
  appointments: Appointment[]
  selectedId?: string | undefined
  showBarber: boolean
  onOpen: (appointment: Appointment) => void
}

export const AgendaWeek = ({
  dates,
  today,
  appointments,
  selectedId,
  showBarber,
  onOpen,
}: AgendaWeekProps) => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 lg:gap-2" aria-label="Agenda semanal">
    {dates.map((day) => {
      const rows = appointmentsForDate(appointments, day)
      return (
        <section key={day} className="min-w-0" aria-label={`Citas del ${dayLabel(day)}`}>
          <h2
            className={cn(
              'mb-2 rounded-control px-3 py-2 font-semibold first-letter:uppercase',
              day === today ? 'bg-ink text-on-ink' : 'bg-surface text-ink',
            )}
          >
            {dayLabel(day)}
            <span className="block text-sm font-normal opacity-80">
              {rows.length === 0
                ? 'Sin citas'
                : rows.length === 1
                  ? '1 cita'
                  : `${rows.length} citas`}
            </span>
          </h2>
          <div className="grid gap-2">
            {rows.map((appointment) => (
              <AppointmentBlock
                key={appointment.id}
                appointment={appointment}
                selected={appointment.id === selectedId}
                overlap={overlapsAnotherAppointment(appointment, appointments)}
                showBarber={showBarber}
                onOpen={() => onOpen(appointment)}
              />
            ))}
          </div>
        </section>
      )
    })}
  </div>
)
