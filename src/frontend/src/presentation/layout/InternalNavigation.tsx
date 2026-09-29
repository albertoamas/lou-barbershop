import { AnimatePresence, m } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AppIcon, type IconName } from '../components/AppIcon'
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

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'group relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/65 transition-colors duration-150 hover:bg-white/8 hover:text-white',
    isActive && 'bg-white text-lou-ink shadow-lg hover:bg-white hover:text-lou-ink',
  )

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-white/55 transition-colors duration-150',
    isActive && 'text-white',
  )

const DesktopLink = ({ item }: { item: NavigationItem }) => (
  <NavLink
    aria-label={item.label}
    className={desktopLinkClass}
    to={item.to}
    end={item.end === true}
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <m.span
            layoutId="desktop-navigation-indicator"
            className="absolute inset-y-2 -left-1 w-1 rounded-full bg-lou-ink"
          />
        )}
        <AppIcon name={item.icon} />
        <span className="hidden lg:inline">{item.label}</span>
      </>
    )}
  </NavLink>
)

const MobileLink = ({ item, onNavigate }: { item: NavigationItem; onNavigate?: () => void }) => (
  <NavLink
    className={mobileLinkClass}
    to={item.to}
    end={item.end === true}
    onClick={() => onNavigate?.()}
  >
    {({ isActive }) => (
      <>
        {isActive && (
          <m.span
            layoutId="mobile-navigation-indicator"
            className="absolute inset-x-5 top-0 h-0.5 rounded-full bg-white"
          />
        )}
        <AppIcon name={item.icon} size={21} />
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
        className="sticky top-0 hidden h-screen flex-col border-r border-white/10 bg-lou-ink px-3 py-5 text-white md:flex lg:px-4"
        aria-label="Navegación principal"
      >
        <BrandLockup compact className="mx-auto lg:hidden" to="/app" useViewTransition={false} />
        <BrandLockup className="hidden px-2 lg:inline-flex" to="/app" useViewTransition={false} />
        <nav className="mt-8 grid gap-1.5">
          {primaryItems.map((item) => (
            <DesktopLink key={item.to} item={item} />
          ))}
          {secondaryItems.length > 0 && <div className="my-2 h-px bg-white/10" />}
          {secondaryItems.map((item) => (
            <DesktopLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-4">
          <div className="hidden px-3 lg:block">
            <span className="block text-[0.65rem] font-bold tracking-[0.16em] text-white/40 uppercase">
              Sesión activa
            </span>
            <strong className="mt-1 block truncate text-sm">{userName}</strong>
          </div>
          <button
            className="mt-2 flex min-h-11 w-full items-center justify-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/60 transition-colors hover:bg-white/8 hover:text-white lg:justify-start"
            type="button"
            onClick={() => void onLogout()}
          >
            <AppIcon name="logout" />
            <span className="hidden lg:inline">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex min-h-16 border-t border-white/10 bg-lou-ink/95 px-1 text-white shadow-[0_-12px_32px_rgb(8_8_8/0.18)] backdrop-blur-xl md:hidden"
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
            'relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-white/55 transition-colors',
            moreOpen && 'text-white',
          )}
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <AppIcon name="more" size={21} />
          <span>Más</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <m.div
            className="fixed inset-0 z-60 flex items-end bg-black/55 p-3 backdrop-blur-sm md:hidden"
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
              className="max-h-[80vh] w-full overflow-y-auto rounded-2xl bg-white p-4 text-lou-ink shadow-lou-lg"
              initial={{ y: 32, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-lou-fog pb-4">
                <span>
                  <small className="block text-[0.65rem] font-bold tracking-[0.16em] text-lou-graphite/50 uppercase">
                    Sesión activa
                  </small>
                  <strong className="mt-1 block">{userName}</strong>
                </span>
                <button
                  ref={closeButtonRef}
                  className="grid size-11 place-items-center rounded-xl bg-black/5 text-2xl"
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
                        'flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-lou-graphite/70 transition-colors hover:bg-black/5',
                        isActive && 'bg-lou-ink text-white',
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
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-lou-danger/25 bg-red-50 font-bold text-lou-danger"
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
