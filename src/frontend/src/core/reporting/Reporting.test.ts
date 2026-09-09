import { describe, expect, it } from 'vitest'
import { basisPointsToPercent } from './Reporting'

describe('reporting presentation rules', () => {
  it('renders integer basis points without losing precision', () => {
    expect(basisPointsToPercent(3333)).toBe('33.33 %')
  })
})
