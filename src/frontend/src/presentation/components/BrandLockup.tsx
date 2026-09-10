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
        className="size-12 shrink-0 rounded-xl border border-white/20 object-cover shadow-lg"
        src="/brand/lou-logo.jpg"
        alt=""
      />
      {!compact && (
        <span className="leading-none">
          <strong className="block font-display text-2xl tracking-tight">Lou</strong>
          <small className="mt-0.5 block font-display text-[0.68rem] font-semibold tracking-[0.2em] text-current/65 uppercase">
            Barbershop
          </small>
        </span>
      )}
    </>
  )

  return linked ? (
    <Link
      className={cn(
        'inline-flex items-center gap-3 rounded-xl text-inherit no-underline transition-opacity duration-150 hover:opacity-80',
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
