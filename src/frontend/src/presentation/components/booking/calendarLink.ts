import { calendarEvent, type PublicAppointment } from '../../../core/public-booking/PublicBooking'
import { publicSite } from '../../content/publicSite'

// A "data:" link to an iCalendar file for the appointment, built on the device.
export const calendarFileHref = (
  appointment: Pick<
    PublicAppointment,
    'id' | 'serviceName' | 'barberName' | 'startsAt' | 'durationMinutes'
  >,
  managementUrl: string,
) =>
  `data:text/calendar;charset=utf-8,${encodeURIComponent(
    calendarEvent({
      id: appointment.id,
      title: `${appointment.serviceName} en Lou Barbershop`,
      startsAt: appointment.startsAt,
      durationMinutes: appointment.durationMinutes,
      location: publicSite.address ?? `Lou Barbershop, ${publicSite.city}`,
      description: `Con ${appointment.barberName}. Para cambiar o cancelar: ${managementUrl}`,
    }),
  )}`
