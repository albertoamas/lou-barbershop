import { agendaTime } from '../../../core/agenda/Agenda'

export const bookingSteps = ['Servicio', 'Barbero', 'Día y hora', 'Tus datos', 'Confirmar'] as const

// "martes, 6 de octubre, 08:00" in shop time and 24-hour format.
export const bookingDateTime = (startsAt: string) =>
  `${new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(startsAt))}, ${agendaTime(startsAt)}`

// "mar 6 oct" for a business date (YYYY-MM-DD).
export const shortDay = (date: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(new Date(`${date}T12:00:00Z`))
    .replace(/\./g, '')
