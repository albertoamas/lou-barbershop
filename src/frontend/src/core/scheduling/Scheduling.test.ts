import { describe, expect, it } from 'vitest'
import { addCalendarDays, businessLocalToIso, todayInBusinessTime } from './Scheduling'

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
})
