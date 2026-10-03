import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from '../styles/cn'
import { Stripes } from './Stripes'

// Pill that names a state. Color is never the only cue: the label is always text and
// the "inService" tone adds the barber-pole stripes (plan section 3.4).
const badgeStyles = cva(
  'inline-flex min-h-7 items-center gap-1.5 rounded-full px-3 text-sm font-semibold whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'border-2 border-ink bg-surface text-ink',
        muted: 'bg-surface-muted text-ink-soft',
        accent: 'bg-accent-soft text-ink',
        info: 'bg-info-soft text-info-ink',
        success: 'bg-success-soft text-success-ink',
        warning: 'bg-warning-soft text-warning-ink',
        danger: 'bg-danger-soft text-danger-ink',
        inService: 'bg-ink pl-1.5 text-on-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

type StatusBadgeProps = VariantProps<typeof badgeStyles> & {
  children: ReactNode
  icon?: ReactNode
  className?: string
}

export const StatusBadge = ({ tone, icon, children, className }: StatusBadgeProps) => (
  <span className={cn(badgeStyles({ tone }), className)}>
    {tone === 'inService' && <Stripes className="size-4 rounded-full" />}
    {icon}
    {children}
  </span>
)
