import type { CSSProperties } from 'react'
import { cn } from '../styles/cn'

// Barber-pole stripes, the brand's graphic device (plan section 3.4). Only for the
// "in service" state, photo slots and the public brand band.
const patterns = {
  strong:
    'repeating-linear-gradient(-45deg, var(--color-ink) 0 9px, var(--color-surface) 9px 18px)',
  soft: 'repeating-linear-gradient(-45deg, var(--color-line) 0 9px, var(--color-surface-muted) 9px 18px)',
} as const

interface StripesProps {
  tone?: keyof typeof patterns
  className?: string
}

export const Stripes = ({ tone = 'strong', className }: StripesProps) => {
  const style: CSSProperties = { backgroundImage: patterns[tone] }
  return <span aria-hidden="true" className={cn('block', className)} style={style} />
}
