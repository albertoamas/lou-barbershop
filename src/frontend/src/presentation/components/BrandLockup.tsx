import { Link } from 'react-router-dom'
import { cn } from '../styles/cn'

interface BrandLockupProps {
  className?: string
  compact?: boolean
  linked?: boolean
  to?: string
  useViewTransition?: boolean
}

export const BrandLockup = ({
  className,
  compact = false,
  linked = true,
  to = '/',
  useViewTransition = true,
}: BrandLockupProps) => {
  const content = (
    <>
      <img
        className={cn('shrink-0 rounded-control object-cover', compact ? 'size-16' : 'size-12')}
        src="/icons/icon-192.png"
        alt=""
        width={64}
        height={64}
      />
      {!compact && (
        <span className="leading-none">
          <strong className="block font-display text-2xl font-extrabold">Lou</strong>
          <span className="mt-1 block text-sm text-current/70">Barbershop</span>
        </span>
      )}
    </>
  )

  return linked ? (
    <Link
      className={cn(
        'inline-flex items-center gap-3 rounded-control text-inherit no-underline transition-opacity duration-150 hover:opacity-80',
        className,
      )}
      to={to}
      viewTransition={useViewTransition}
      aria-label="Lou Barbershop, inicio"
    >
      {content}
    </Link>
  ) : (
    <div
      className={cn('inline-flex items-center gap-3 text-inherit', className)}
      aria-label="Lou Barbershop"
    >
      {content}
    </div>
  )
}
