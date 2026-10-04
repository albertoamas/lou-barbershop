import { describe, expect, it } from 'vitest'
import {
  exceptionWhen,
  fitsOpeningWindow,
  isUpcomingException,
  isWholeDay,
  pastShifts,
  shiftNote,
  shiftsOn,
  timeRangeText,
  wholeDayRange,
} from './Availability'
import type { AvailabilityException, WorkingSchedule } from './Scheduling'

const shift = (overrides: Partial<WorkingSchedule>): WorkingSchedule => ({
  id: 'shift',
  barberId: 'barber',
  weekday: 1,
  startLocalTime: '08:00',
  endLocalTime: '13:00',
  validFrom: '2026-09-01',
  active: true,
  version: 1,
  ...overrides,
})

const exception = (startsAt: string, endsAt: string): AvailabilityException => ({
  id: 'exception',
  barberId: 'barber',
  startsAt,
  endsAt,
  kind: 'UNAVAILABLE',
  reason: 'Vacaciones',
  active: true,
  version: 1,
})

describe('weekly shifts', () => {
  const today = '2026-10-04'

  it('lists the current shifts of a weekday by start time and sends the rest to history', () => {
    const afternoon = shift({ id: 'pm', startLocalTime: '15:00', endLocalTime: '21:00' })
    const morning = shift({ id: 'am' })
    const ended = shift({ id: 'old', validTo: '2026-09-30' })
    const off = shift({ id: 'off', active: false })
    const all = [afternoon, morning, ended, off, shift({ id: 'tue', weekday: 2 })]

    expect(shiftsOn(all, 1, today).map((item) => item.id)).toEqual(['am', 'pm'])
    expect(pastShifts(all, today).map((item) => item.id)).toEqual(['old', 'off'])
  })

  it('notes shifts that start later, end or are inactive', () => {
    expect(shiftNote(shift({ validFrom: '2026-10-15' }), today)).toBe('Desde el jue 15 oct')
    expect(shiftNote(shift({ validTo: '2026-12-31' }), today)).toBe('Hasta el jue 31 dic')
    expect(shiftNote(shift({ active: false }), today)).toBe('Inactivo')
    expect(shiftNote(shift({}), today)).toBeUndefined()
  })

  it('writes ranges with words and keeps shifts inside one opening window', () => {
    expect(timeRangeText('08:00:00', '13:00:00')).toBe('08:00 a 13:00')
    expect(fitsOpeningWindow('09:00', '12:00')).toBe(true)
    expect(fitsOpeningWindow('12:00', '16:00')).toBe(false)
    expect(fitsOpeningWindow('16:00', '15:00')).toBe(false)
  })
})

describe('exceptions in words', () => {
  it('describes one whole day, several days and a few hours', () => {
    const day = wholeDayRange('2026-10-05', '2026-10-05')
    expect(isWholeDay(day)).toBe(true)
    expect(exceptionWhen(day)).toBe('lun 5 oct, todo el día')
    expect(exceptionWhen(wholeDayRange('2026-10-05', '2026-10-09'))).toBe(
      'Del lun 5 oct al vie 9 oct, todo el día',
    )
    // 19:00Z to 22:00Z is 15:00 to 18:00 in La Paz.
    expect(
      exceptionWhen({ startsAt: '2026-10-06T19:00:00Z', endsAt: '2026-10-06T22:00:00Z' }),
    ).toBe('mar 6 oct, 15:00 a 18:00')
  })

  it('keeps an exception upcoming until its last day ends', () => {
    const range = wholeDayRange('2026-10-01', '2026-10-04')
    const item = exception(range.startsAt, range.endsAt)
    expect(isUpcomingException(item, '2026-10-04')).toBe(true)
    expect(isUpcomingException(item, '2026-10-05')).toBe(false)
  })
})
