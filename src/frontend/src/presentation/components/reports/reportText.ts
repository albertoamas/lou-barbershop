import type { PeriodPreset, SeriesBucket, SeriesGrain } from '../../../core/reporting/Reporting'

const format = (options: Intl.DateTimeFormatOptions) => {
  const formatter = new Intl.DateTimeFormat('es-BO', { timeZone: 'UTC', ...options })
  return (date: string) => formatter.format(new Date(`${date}T12:00:00Z`)).replace(/\./g, '')
}

export const dayMonth = format({ day: 'numeric', month: 'short' })
export const dayMonthYear = format({ day: 'numeric', month: 'short', year: 'numeric' })
const weekdayDayMonth = format({ weekday: 'long', day: 'numeric', month: 'short' })
const monthName = format({ month: 'short' })
const monthYear = format({ month: 'long', year: 'numeric' })

export const dateTimeText = (iso: string) =>
  new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(iso))
    .replace(/\./g, '')

export const rangeText = (from: string, to: string) =>
  from === to ? dayMonthYear(from) : `${dayMonth(from)} a ${dayMonthYear(to)}`

export const presetLabels: Record<PeriodPreset, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  lastMonth: 'Mes pasado',
}

// "12 % más". The compared dates are stated once next to the figures.
export const changeText = (change: number | null) => {
  if (change === null) return 'Sin datos para comparar'
  if (change === 0) return 'Igual'
  return `${Math.abs(change)} % ${change > 0 ? 'más' : 'menos'}`
}

// Short label under a bar and the full description read by screen readers.
export const bucketLabel = (bucket: SeriesBucket, grain: SeriesGrain) =>
  grain === 'day'
    ? String(Number(bucket.from.slice(8)))
    : grain === 'week'
      ? dayMonth(bucket.from)
      : monthName(bucket.from)

export const bucketTitle = (bucket: SeriesBucket, grain: SeriesGrain) => {
  const when =
    grain === 'day'
      ? weekdayDayMonth(bucket.from)
      : grain === 'week'
        ? `Semana del ${dayMonth(bucket.from)} al ${dayMonth(bucket.to)}`
        : monthYear(bucket.from)
  return when.charAt(0).toUpperCase() + when.slice(1)
}

export const plural = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`
