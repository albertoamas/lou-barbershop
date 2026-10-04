import type { AppointmentStatus } from '../../../core/agenda/Agenda'

// Appointment states are told apart by fill, border style and text, never by color
// alone (plan section 3.4).
export const statusBadgeTone = {
  CONFIRMED: 'neutral',
  CHECKED_IN: 'info',
  IN_SERVICE: 'inService',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
} as const satisfies Record<AppointmentStatus, string>

export const statusBlockClassName: Record<AppointmentStatus, string> = {
  CONFIRMED: 'border-2 border-ink bg-surface text-ink',
  CHECKED_IN: 'border-2 border-info bg-info-soft text-ink',
  IN_SERVICE: 'border-2 border-ink bg-ink text-on-ink',
  COMPLETED: 'border-2 border-transparent bg-success-soft text-success-ink',
  CANCELLED: 'border-2 border-dashed border-danger bg-danger-soft text-danger-ink',
  NO_SHOW: 'border-2 border-dashed border-danger bg-danger-soft text-danger-ink',
}
