import { describe, expect, it } from 'vitest'
import { canExecuteCriticalMutation } from './canExecuteCriticalMutation'

describe('canExecuteCriticalMutation', () => {
  it('blocks critical mutations while offline', () => {
    expect(canExecuteCriticalMutation('offline')).toBe(false)
  })

  it('allows the UI to request a mutation while online', () => {
    expect(canExecuteCriticalMutation('online')).toBe(true)
  })
})
