import { describe, expect, it } from 'vitest'
import { openingHoursText, openingStatus, openingStatusText } from './OpeningHours'

// La Paz is UTC-4: 14:00Z is 10:00 in the shop.
describe('opening hours', () => {
  it('says until when it is open during a shift', () =>
    expect(openingStatusText(openingStatus(new Date('2026-10-04T14:00:00Z')))).toBe(
      'Abierto ahora, hasta las 13:00',
    ))

  it('says when it reopens during the midday closure', () =>
    expect(openingStatusText(openingStatus(new Date('2026-10-04T17:30:00Z')))).toBe(
      'Cerrado, abrimos a las 15:00',
    ))

  it('points to tomorrow after closing', () =>
    expect(openingStatusText(openingStatus(new Date('2026-10-05T02:00:00Z')))).toBe(
      'Cerrado, abrimos mañana a las 08:00',
    ))

  it('opens before the first shift of the same day', () =>
    expect(openingStatusText(openingStatus(new Date('2026-10-04T11:00:00Z')))).toBe(
      'Cerrado, abrimos a las 08:00',
    ))

  it('writes both shifts with words', () =>
    expect(openingHoursText()).toBe('08:00 a 13:00 y 15:00 a 21:00'))
})
