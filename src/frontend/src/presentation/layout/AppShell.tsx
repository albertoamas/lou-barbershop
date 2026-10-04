import { useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandLockup } from '../components/BrandLockup'
import { ConnectivityBanner } from '../components/ConnectivityBanner'
import { useConnectivity } from '../hooks/useConnectivity'
import { ServiceWorkerUpdateBanner } from '../components/ServiceWorkerUpdateBanner'
import { SocialLinks } from '../components/SocialLinks'
import { buttonStyles } from '../components/buttonStyles'
import { cn } from '../styles/cn'

interface AppShellProps {
  children: ReactNode
}

const subscribeToScroll = (listener: () => void) => {
  window.addEventListener('scroll', listener, { passive: true })
  return () => window.removeEventListener('scroll', listener)
}

const getScrollSnapshot = () => window.scrollY > 24

const headerLinkClassName =
  'hidden min-h-11 items-center rounded-control px-3 font-semibold text-on-ink-muted transition-colors duration-150 hover:bg-on-ink/10 hover:text-on-ink lg:inline-flex'

const footerLinkClassName =
  'inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline'

export const AppShell = ({ children }: AppShellProps) => {
  const connectivity = useConnectivity()
  const location = useLocation()
  const landingScreen = location.pathname === '/'
  const landingHeaderScrolled = useSyncExternalStore(
    subscribeToScroll,
    getScrollSnapshot,
    () => false,
  )
  const internalPath = location.pathname === '/app' || location.pathname.startsWith('/app/')
  const publicShell = !internalPath
  const contentRef = useRef<HTMLDivElement>(null)
  const previousPath = useRef(location.pathname)

  useEffect(() => {
    if (previousPath.current === location.pathname) return
    previousPath.current = location.pathname
    if (location.hash) return
    contentRef.current?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [location.pathname, location.hash])

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-canvas text-ink">
      <a
        className="sr-only fixed top-3 left-3 z-100 rounded-control bg-surface px-4 py-3 font-bold text-ink shadow-floating focus:not-sr-only"
        href="#main-content"
      >
        Saltar al contenido
      </a>
      {publicShell && (
        <header
          className={cn(
            'top-0 z-40 w-full text-on-ink transition-[background-color,box-shadow] duration-200 [--color-focus:var(--color-on-ink)]',
            landingScreen
              ? cn(
                  'fixed pt-[env(safe-area-inset-top)]',
                  landingHeaderScrolled
                    ? 'bg-ink/95 shadow-floating backdrop-blur'
                    : 'bg-transparent',
                )
              : 'sticky bg-ink/95 pt-[env(safe-area-inset-top)] shadow-floating backdrop-blur',
          )}
          data-landing-header={
            landingScreen ? (landingHeaderScrolled ? 'solid' : 'transparent') : undefined
          }
        >
          <div className="mx-auto flex min-h-18 max-w-360 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <BrandLockup />
            <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navegación pública">
              {landingScreen &&
                [
                  ['#servicios', 'Servicios'],
                  ['#equipo', 'Equipo'],
                  ['#ubicacion', 'Horario'],
                ].map(([href, label]) => (
                  <a key={href} className={headerLinkClassName} href={href}>
                    {label}
                  </a>
                ))}
              <Link
                className={cn(headerLinkClassName, 'sm:inline-flex')}
                to="/mi-cita"
                viewTransition
              >
                Mi cita
              </Link>
              <Link
                className={buttonStyles({ variant: 'inverse', size: 'sm' })}
                to="/reservar"
                viewTransition
              >
                Reservar
              </Link>
            </nav>
          </div>
        </header>
      )}
      <div
        className={
          landingScreen
            ? 'fixed inset-x-0 top-[calc(4.5rem+env(safe-area-inset-top))] z-30'
            : undefined
        }
        data-public-notices={landingScreen ? 'below-fixed-header' : undefined}
      >
        <ConnectivityBanner connectivity={connectivity} />
        <ServiceWorkerUpdateBanner />
      </div>
      <div
        ref={contentRef}
        id="main-content"
        className="min-w-0 flex-1"
        tabIndex={-1}
        aria-label="Contenido de la página"
      >
        {children}
      </div>
      {publicShell && (
        <footer className="border-t border-surface-strong bg-surface pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto grid max-w-360 gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6 lg:px-10">
            <div>
              <BrandLockup linked={false} className="text-ink" />
              <p className="mt-4 max-w-md text-pretty text-ink-soft">
                Reserva sin crear una cuenta y cambia tu cita desde el enlace privado que te
                enviamos.
              </p>
              <SocialLinks />
            </div>
            <nav className="grid content-start" aria-label="Enlaces del pie">
              <Link className={footerLinkClassName} to="/reservar" viewTransition>
                Reservar una cita
              </Link>
              <Link className={footerLinkClassName} to="/mi-cita" viewTransition>
                Gestionar mi cita
              </Link>
              <Link
                className={cn(footerLinkClassName, 'font-normal text-ink-soft')}
                to="/privacidad"
                viewTransition
              >
                Privacidad
              </Link>
              <Link
                className={cn(footerLinkClassName, 'font-normal text-ink-soft')}
                to="/app/login"
                viewTransition
              >
                Acceso del equipo
              </Link>
            </nav>
          </div>
          <p className="border-t border-surface-strong px-4 py-4 text-center text-sm text-ink-soft">
            Lou Barbershop, {new Date().getFullYear()}.
          </p>
        </footer>
      )}
    </div>
  )
}
