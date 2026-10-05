import type { ReactNode } from 'react'
import { cn } from '../../styles/cn'
import { AppIcon } from '../AppIcon'
import { Avatar } from '../Avatar'
import { StatusBadge } from '../StatusBadge'

export interface ConfigRow {
  id: string
  title: string
  detail: string
  active: boolean
  aside?: string
}

// Tappable rows for any configuration list. Deactivated rows say so in words.
export const ConfigList = ({
  rows,
  empty,
  people = false,
  inactiveLabel = 'Desactivado',
  onOpen,
}: {
  rows: ConfigRow[]
  empty: ReactNode
  people?: boolean
  inactiveLabel?: string
  onOpen: (id: string) => void
}) =>
  rows.length === 0 ? (
    <p className="rounded-control bg-surface-muted p-5 text-ink-soft">{empty}</p>
  ) : (
    <ul className="grid gap-1">
      {rows.map((row) => (
        <li key={row.id}>
          <button
            type="button"
            className={cn(
              'flex min-h-16 w-full items-center gap-3 rounded-control px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-muted',
              !row.active && 'text-ink-soft',
            )}
            onClick={() => onOpen(row.id)}
          >
            {people && <Avatar name={row.title} tone={row.active ? 'ink' : 'neutral'} />}
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-ink">{row.title}</span>
                {!row.active && <StatusBadge tone="muted">{inactiveLabel}</StatusBadge>}
              </span>
              <span className="block text-ink-soft">{row.detail}</span>
            </span>
            {row.aside && (
              <span className="shrink-0 font-bold text-ink tabular-nums">{row.aside}</span>
            )}
            <AppIcon name="chevron-right" size={18} />
          </button>
        </li>
      ))}
    </ul>
  )
