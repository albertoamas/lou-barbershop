import type { AppointmentStatus } from '../../../core/agenda/Agenda'

// Appointment states are told apart by fill, side band, border style and text, never by
// color alone (plan section 3.4).
export const statusBadgeTone = {
  CONFIRMED: 'neutral',
  CHECKED_IN: 'info',
  IN_SERVICE: 'inService',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
} as const satisfies Record<AppointmentStatus, string>

// Calendar style blocks: a soft fill with a strong band on the leading edge.
export const statusBlockClassName: Record<AppointmentStatus, string> = {
  CONFIRMED: 'border border-l-4 border-line border-l-ink bg-surface text-ink shadow-raised',
  CHECKED_IN: 'border-l-4 border-info bg-info-soft text-ink',
  IN_SERVICE: 'border-l-4 border-ink bg-ink text-on-ink',
  COMPLETED: 'border-l-4 border-success bg-success-soft text-success-ink',
  CANCELLED: 'border border-l-4 border-dashed border-danger bg-surface text-danger-ink',
  NO_SHOW: 'border border-l-4 border-dashed border-danger bg-surface text-danger-ink',
}
