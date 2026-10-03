import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../styles/cn'
import { initialsOf } from './initials'

const avatarStyles = cva(
  'inline-grid shrink-0 place-items-center rounded-full font-bold select-none',
  {
    variants: {
      size: {
        sm: 'size-8 text-sm',
        md: 'size-10 text-sm',
        lg: 'size-14 text-lg',
      },
      tone: {
        ink: 'bg-ink text-on-ink',
        neutral: 'bg-surface-strong text-ink',
        accent: 'bg-accent text-on-accent',
        onInk: 'bg-ink-soft text-on-ink',
      },
    },
    defaultVariants: { size: 'md', tone: 'neutral' },
  },
)

type AvatarProps = VariantProps<typeof avatarStyles> & {
  name: string
  className?: string
}

// Decorative: the person's name is always shown next to the avatar.
export const Avatar = ({ name, size, tone, className }: AvatarProps) => (
  <span className={cn(avatarStyles({ size, tone }), className)} aria-hidden="true">
    {initialsOf(name)}
  </span>
)
