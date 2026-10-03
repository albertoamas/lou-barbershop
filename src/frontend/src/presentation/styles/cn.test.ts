import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('lets a later theme radius override an earlier one', () => {
    expect(cn('rounded-control', 'rounded-panel')).toBe('rounded-panel')
  })

  it('lets a later theme shadow override an earlier one', () => {
    expect(cn('shadow-raised', 'shadow-floating')).toBe('shadow-floating')
  })

  it('keeps a text color and a text size together', () => {
    expect(cn('text-ink-muted', 'text-sm')).toBe('text-ink-muted text-sm')
  })
})
