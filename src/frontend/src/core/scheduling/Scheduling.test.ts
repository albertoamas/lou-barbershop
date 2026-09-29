import { describe, expect, it } from 'vitest'
import {
  addCalendarDays,
  businessLocalToIso,
  exceptionAppliesOn,
  scheduleAppliesOn,
  todayInBusinessTime,
  weekStartFor,
  type AvailabilityException,
  type WorkingSchedule,
} from './Scheduling'

describe('business-time helpers', () => {
  it('uses the business date instead of the browser timezone', () => {
    expect(todayInBusinessTime(new Date('2026-09-03T02:30:00Z'))).toBe('2026-09-02')
  })

  it('adds calendar days across month boundaries', () => {
    expect(addCalendarDays('2026-09-30', 1)).toBe('2026-10-01')
  })

  it('serializes a local input with the Bolivia offset', () => {
    expect(businessLocalToIso('2026-09-02T09:15')).toBe('2026-09-02T09:15:00-04:00')
  })

  it('starts the visual week on Monday, including when selected date is Sunday', () => {
    expect(weekStartFor('2026-09-20')).toBe('2026-09-14')
  })

  it('shows only active schedules within their validity period and matching weekday', () => {
    const schedule: WorkingSchedule = {
      id: 'schedule-1',
      barberId: 'barber-1',
      weekday: 1,
      startLocalTime: '08:00',
      endLocalTime: '13:00',
      validFrom: '2026-09-14',
      validTo: '2026-09-21',
      active: true,
      version: 1,
    }
    expect(scheduleAppliesOn(schedule, '2026-09-14')).toBe(true)
    expect(scheduleAppliesOn(schedule, '2026-09-21')).toBe(true)
    expect(scheduleAppliesOn(schedule, '2026-09-28')).toBe(false)
    expect(scheduleAppliesOn({ ...schedule, active: false }, '2026-09-14')).toBe(false)
  })

  it('places exceptions on the business date rather than the browser date', () => {
    const exception: AvailabilityException = {
      id: 'exception-1',
      barberId: 'barber-1',
      startsAt: '2026-09-17T23:30:00-04:00',
      endsAt: '2026-09-18T00:30:00-04:00',
      kind: 'UNAVAILABLE',
      reason: 'Ausencia',
      active: true,
      version: 1,
    }
    expect(exceptionAppliesOn(exception, '2026-09-17')).toBe(true)
    expect(exceptionAppliesOn(exception, '2026-09-18')).toBe(true)
    expect(exceptionAppliesOn(exception, '2026-09-19')).toBe(false)
    expect(
      exceptionAppliesOn({ ...exception, endsAt: '2026-09-18T00:00:00-04:00' }, '2026-09-18'),
    ).toBe(false)
  })
})
