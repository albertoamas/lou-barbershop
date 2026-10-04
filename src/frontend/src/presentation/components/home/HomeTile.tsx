import { Link } from 'react-router-dom'
import { cn } from '../../styles/cn'
import { AppIcon, type IconName } from '../AppIcon'

const tones = {
  neutral: 'bg-surface text-ink shadow-raised hover:shadow-floating',
  info: 'bg-info-soft text-info-ink hover:ring-2 hover:ring-info',
  success: 'bg-success-soft text-success-ink hover:ring-2 hover:ring-success',
  warning: 'bg-warning-soft text-warning-ink hover:ring-2 hover:ring-warning',
  ink: 'bg-ink text-on-ink hover:bg-ink-soft',
} as const

interface HomeTileProps {
  label: string
  value: string
  hint?: string | undefined
  icon: IconName
  to: string
  state?: unknown
  // Highlights a tile that needs someone, such as customers waiting.
  tone?: keyof typeof tones
  className?: string
}

// A number that is also the way to act on it: tapping "Por cobrar 2" opens the charge
// screen, so the home never shows a figure without its destination.
export const HomeTile = ({
  label,
  value,
  hint,
  icon,
  to,
  state,
  tone = 'neutral',
  className,
}: HomeTileProps) => (
  <Link
    className={cn(
      'flex min-h-24 flex-col justify-between gap-2 rounded-panel p-4 transition-[box-shadow,background-color] duration-150',
      tones[tone],
      className,
    )}
    to={to}
    state={state}
  >
    <span className="flex items-start justify-between gap-2 font-semibold">
      <span className="min-w-0">{label}</span>
      <span className="shrink-0">
        <AppIcon name={icon} size={20} />
      </span>
    </span>
    <span>
      <span className="block font-display text-4xl leading-none font-extrabold break-words tabular-nums">
        {value}
      </span>
      {hint && <span className="mt-1 block text-sm opacity-85">{hint}</span>}
    </span>
  </Link>
)
