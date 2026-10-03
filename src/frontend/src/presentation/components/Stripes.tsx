import type { CSSProperties } from 'react'
import { cn } from '../styles/cn'

// Barber-pole stripes, the brand's graphic device (plan section 3.4). Only for the
// "in service" state, photo slots and the public brand band.
const colors = {
  strong: ['var(--color-ink)', 'var(--color-surface)'],
  soft: ['var(--color-line)', 'var(--color-surface-muted)'],
} as const

// Band width in px: regular for surfaces, fine for small marks such as badges.
const bands = { regular: 9, fine: 3 } as const

interface StripesProps {
  tone?: keyof typeof colors
  density?: keyof typeof bands
  className?: string
}

export const Stripes = ({ tone = 'strong', density = 'regular', className }: StripesProps) => {
  const [first, second] = colors[tone]
  const band = bands[density]
  const style: CSSProperties = {
    backgroundImage: `repeating-linear-gradient(-45deg, ${first} 0 ${band}px, ${second} ${band}px ${band * 2}px)`,
  }
  return <span aria-hidden="true" className={cn('block', className)} style={style} />
}
