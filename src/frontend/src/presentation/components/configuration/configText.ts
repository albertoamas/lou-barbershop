const formatter = new Intl.DateTimeFormat('es-BO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

// "2 sept 2026"
export const longDate = (date: string) =>
  formatter.format(new Date(`${date}T12:00:00Z`)).replace(/\./g, '')

// "desde el 2 sept 2026" or "del 2 sept 2026 al 30 sept 2026"
export const validityText = (from: string, to?: string | null) =>
  to ? `del ${longDate(from)} al ${longDate(to)}` : `desde el ${longDate(from)}`
