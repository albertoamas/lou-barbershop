import { describe, expect, it } from 'vitest'
import { initialsOf } from './initials'

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('Pablo Suárez Rojas')).toBe('PS')
  })

  it('handles a single name and extra spaces', () => {
    expect(initialsOf('  mateo  ')).toBe('M')
  })

  it('upper-cases accented initials', () => {
    expect(initialsOf('álvaro ñuflo')).toBe('ÁÑ')
  })
})
