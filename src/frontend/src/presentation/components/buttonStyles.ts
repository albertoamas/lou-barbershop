import { cva } from 'class-variance-authority'

// Variants follow the color rules of plan section 3.4: primary (ink) for main actions
// on light surfaces, inverse (white) for main actions on dark surfaces, money (green)
// for actions that record money, danger and dangerSoft for destructive ones.
export const buttonStyles = cva(
  'inline-flex items-center justify-center gap-2 rounded-control border font-bold transition-[background-color,border-color,color,scale] duration-150 ease-lou active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'border-ink bg-ink text-on-ink hover:border-ink-soft hover:bg-ink-soft',
        inverse: 'border-surface bg-surface text-ink hover:bg-surface-muted',
        money: 'border-success bg-success text-on-ink hover:bg-success-ink',
        secondary: 'border-line-control bg-surface text-ink hover:bg-surface-muted',
        ghost: 'border-transparent bg-transparent text-ink hover:bg-surface-muted',
        danger: 'border-danger bg-danger text-on-ink hover:bg-danger-ink',
        dangerSoft: 'border-transparent bg-danger-soft text-danger-ink hover:border-danger',
      },
      size: {
        sm: 'min-h-11 px-4 text-sm',
        md: 'min-h-12 px-5 text-base',
        lg: 'min-h-14 px-6 text-lg',
      },
      width: {
        auto: 'w-auto',
        full: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      width: 'auto',
    },
  },
)
