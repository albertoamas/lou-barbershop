import { Link } from 'react-router-dom'

interface BrandLockupProps {
  compact?: boolean
  linked?: boolean
}

export const BrandLockup = ({ compact = false, linked = true }: BrandLockupProps) => {
  const content = (
    <>
      <img className="brand-logo" src="/brand/lou-logo.jpg" alt="" />
      {!compact && (
        <span className="brand-name">
          <strong>Lou</strong>
          <small>Barbershop</small>
        </span>
      )}
    </>
  )

  return linked ? (
    <Link className="brand-lockup" to="/" aria-label="Lou Barbershop, inicio">
      {content}
    </Link>
  ) : (
    <div className="brand-lockup" aria-label="Lou Barbershop">
      {content}
    </div>
  )
}
