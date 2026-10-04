import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../styles/cn'
import { buttonStyles } from '../buttonStyles'

interface HomeSectionProps {
  id: string
  title: string
  // Where the section continues, as a plain worded link ("Ver agenda").
  action?: { label: string; to: string } | undefined
  className?: string
  children: ReactNode
}

export const HomeSection = ({ id, title, action, className, children }: HomeSectionProps) => (
  <section
    className={cn('rounded-panel bg-surface p-5 shadow-raised sm:p-6', className)}
    aria-labelledby={id}
  >
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="font-display text-2xl font-extrabold">
        {title}
      </h2>
      {action && (
        <Link
          className={cn(buttonStyles({ variant: 'ghost', size: 'sm' }), '-mr-3')}
          to={action.to}
        >
          {action.label}
        </Link>
      )}
    </div>
    {children}
  </section>
)
