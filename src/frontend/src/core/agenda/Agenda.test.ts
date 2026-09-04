import { describe, expect, it } from 'vitest'
import { agendaActions, agendaTime, statusLabels } from './Agenda'

describe('agenda presentation rules', () => {
  it('offers arrival but never cancellation to a barber', () => {
    expect(agendaActions('CONFIRMED', false)).toEqual(['check-in'])
  })
  it('does not offer phase-seven completion or changes after service starts', () => {
    expect(agendaActions('IN_SERVICE', true)).toEqual([])
  })
  it('offers cancellation after arrival only to management', () => {
    expect(agendaActions('CHECKED_IN', true)).toEqual(['start', 'cancel'])
  })
  it('keeps cancelled and no-show states explicit without color', () => {
    expect(statusLabels.CANCELLED).toBe('Cancelada')
    expect(statusLabels.NO_SHOW).toBe('No asistió')
  })
  it('formats time using Bolivia regardless of the device zone', () => {
    expect(agendaTime('2026-09-04T13:00:00Z')).toBe('09:00')
  })
})
