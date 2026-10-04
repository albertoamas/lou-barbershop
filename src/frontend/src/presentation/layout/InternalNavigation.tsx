import { AnimatePresence, m } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AppIcon, type IconName } from '../components/AppIcon'
import { Avatar } from '../components/Avatar'
import { BrandLockup } from '../components/BrandLockup'
import { cn } from '../styles/cn'

interface InternalNavigationProps {
  roles: string[]
  userName: string
  onLogout: () => Promise<void>
}

interface NavigationItem {
  icon: IconName
  label: string
  shortLabel?: string
  to: string
  end?: boolean
}

// Tablet rail (md) shows icon over label; desktop sidebar (xl) shows them in a row.
const sideLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-16 flex-col items-center justify-center gap-1 rounded-control px-1 text-center text-sm font-semibold text-on-ink-muted transition-colors duration-150 hover:bg-ink-soft hover:text-on-ink',
    'xl:min-h-12 xl:flex-row xl:justify-start xl:gap-3 xl:px-3 xl:text-left',
    isActive && 'bg-surface text-ink hover:bg-surface hover:text-ink',
  )

const SideLink = ({ item }: { item: NavigationItem }) => (
  <NavLink aria-label={item.label} className={sideLinkClass} to={item.to} end={item.end === true}>
    <AppIcon name={item.icon} />
    <span className="leading-tight xl:hidden">{item.shortLabel ?? item.label}</span>
    <span className="hidden xl:inline">{item.label}</span>
  </NavLink>
)

const MobileLink = ({ item }: { item: NavigationItem }) => (
  <NavLink
    className={({ isActive }) =>
      cn(
        'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-sm font-semibold text-on-ink-muted transition-colors duration-150',
        isActive && 'text-on-ink',
      )
    }
    to={item.to}
    end={item.end === true}
  >
    {({ isActive }) => (
      <>
        <span
          className={cn(
            'grid h-8 w-12 place-items-center rounded-full transition-colors duration-150',
            isActive && 'bg-surface text-ink',
          )}
        >
          <AppIcon name={item.icon} size={21} />
        </span>
        <span>{item.shortLabel ?? item.label}</span>
      </>
    )}
  </NavLink>
)

export const InternalNavigation = ({ roles, userName, onLogout }: InternalNavigationProps) => {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  useEffect(() => {
    if (moreOpen) closeButtonRef.current?.focus()
    else if (wasOpen.current) moreButtonRef.current?.focus()
    wasOpen.current = moreOpen
  }, [moreOpen])
  const isOwner = roles.includes('OWNER')
  const isAdmin = roles.includes('ADMIN')
  const isBarberOnly = roles.includes('BARBER') && !isOwner && !isAdmin
  const canManage = isOwner || isAdmin
  const earnsCommission = isOwner || roles.includes('BARBER')

  const primaryItems: NavigationItem[] = [
    { icon: 'home', label: isBarberOnly ? 'Mi día' : 'Inicio', to: '/app', end: true },
    { icon: 'calendar', label: 'Agenda', to: '/app/agenda' },
    { icon: 'scissors', label: 'Atender y cobrar', shortLabel: 'Atender', to: '/app/atenciones' },
  ]

  const secondaryItems: NavigationItem[] = [
    ...(earnsCommission
      ? [
          {
            icon: 'wallet' as const,
            label: isBarberOnly ? 'Mis comisiones' : 'Comisiones',
            to: '/app/comisiones',
          },
        ]
      : []),
    ...(isOwner ? [{ icon: 'chart' as const, label: 'Reportes', to: '/app/reportes' }] : []),
    ...(canManage
      ? [
          {
            icon: 'box' as const,
            label: 'Inventario y gastos',
            shortLabel: 'Inventario',
            to: '/app/inventario',
          },
        ]
      : []),
    { icon: 'clock', label: 'Disponibilidad', to: '/app/disponibilidad' },
    { icon: 'shield', label: 'Seguridad', to: '/app/seguridad' },
    ...(isOwner
      ? [{ icon: 'settings' as const, label: 'Configuración', to: '/app/configuracion' }]
      : []),
  ]

  return (
    <>
      <aside
        className="sticky top-0 hidden h-dvh flex-col overflow-y-auto bg-ink [--color-focus:var(--color-on-ink)] px-2 py-4 text-on-ink md:flex xl:px-4 xl:py-5"
        aria-label="Navegación principal"
      >
        <BrandLockup compact className="mx-auto xl:hidden" to="/app" useViewTransition={false} />
        <BrandLockup className="hidden px-2 xl:inline-flex" to="/app" useViewTransition={false} />
        <nav className="mt-6 grid gap-1">
          {primaryItems.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
          {secondaryItems.length > 0 && <div className="mx-2 my-2 h-px bg-ink-soft" />}
          {secondaryItems.map((item) => (
            <SideLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-auto pt-4">
          <div className="hidden items-center gap-3 px-2 xl:flex">
            <Avatar name={userName} tone="onInk" />
            <span className="min-w-0">
              <span className="block text-sm text-on-ink-muted">Sesión activa</span>
              <strong className="block truncate">{userName}</strong>
            </span>
          </div>
          <button
            className="mt-3 flex min-h-12 w-full flex-col items-center justify-center gap-1 rounded-control px-1 text-sm font-semibold text-on-ink-muted transition-colors hover:bg-ink-soft hover:text-on-ink xl:flex-row xl:justify-start xl:gap-3 xl:px-3"
            type="button"
            onClick={() => void onLogout()}
          >
            <AppIcon name="logout" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex min-h-16 bg-ink [--color-focus:var(--color-on-ink)] px-1 pb-[env(safe-area-inset-bottom)] text-on-ink md:hidden"
        aria-label="Navegación principal móvil"
      >
        {primaryItems.map((item) => (
          <MobileLink key={item.to} item={item} />
        ))}
        <button
          ref={moreButtonRef}
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          className={cn(
            'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-sm font-semibold text-on-ink-muted transition-colors',
            moreOpen && 'text-on-ink',
          )}
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <span
            className={cn(
              'grid h-8 w-12 place-items-center rounded-full transition-colors duration-150',
              moreOpen && 'bg-surface text-ink',
            )}
          >
            <AppIcon name="more" size={21} />
          </span>
          <span>Más</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <m.div
            className="fixed inset-0 z-60 flex items-end bg-ink/55 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(event) => {
              if (event.currentTarget === event.target) setMoreOpen(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setMoreOpen(false)
                return
              }
              if (event.key !== 'Tab') return
              const focusable = Array.from(
                menuRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ??
                  [],
              )
              const first = focusable[0]
              const last = focusable.at(-1)
              if (event.shiftKey && document.activeElement === first && last) {
                event.preventDefault()
                last.focus()
              } else if (!event.shiftKey && document.activeElement === last && first) {
                event.preventDefault()
                first.focus()
              }
            }}
          >
            <m.div
              ref={menuRef}
              id="mobile-more-menu"
              role="dialog"
              aria-modal="true"
              aria-label="Más opciones del equipo"
              className="max-h-[85dvh] w-full overflow-y-auto rounded-t-sheet bg-surface px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] text-ink shadow-overlay"
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <span aria-hidden="true" className="mx-auto block h-1 w-10 rounded-full bg-line" />
              <div className="mt-3 flex items-center justify-between gap-4 border-b border-surface-muted pb-4">
                <span className="flex min-w-0 items-center gap-3">
                  <Avatar name={userName} tone="ink" />
                  <span className="min-w-0">
                    <span className="block text-sm text-ink-muted">Sesión activa</span>
                    <strong className="block truncate">{userName}</strong>
                  </span>
                </span>
                <button
                  ref={closeButtonRef}
                  className="grid size-12 shrink-0 place-items-center rounded-full bg-surface-muted"
                  type="button"
                  aria-label="Cerrar menú"
                  onClick={() => setMoreOpen(false)}
                >
                  <AppIcon name="close" />
                </button>
              </div>
              <nav className="grid gap-1 py-3">
                {secondaryItems.map((item) => (
                  <NavLink
                    key={item.to}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-14 items-center gap-3 rounded-control px-3 font-semibold text-ink-soft transition-colors hover:bg-surface-muted',
                        isActive && 'bg-ink text-on-ink hover:bg-ink',
                      )
                    }
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                  >
                    <AppIcon name={item.icon} />
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <button
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-control bg-danger-soft font-bold text-danger-ink"
                type="button"
                onClick={() => void onLogout()}
              >
                <AppIcon name="logout" />
                Cerrar sesión
              </button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
