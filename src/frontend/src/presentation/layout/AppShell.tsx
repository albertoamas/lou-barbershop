import { useSyncExternalStore, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BrandLockup } from '../components/BrandLockup'
import { ConnectivityBanner } from '../components/ConnectivityBanner'
import { useConnectivity } from '../hooks/useConnectivity'
import { ServiceWorkerUpdateBanner } from '../components/ServiceWorkerUpdateBanner'
import { SocialLinks } from '../components/SocialLinks'

interface AppShellProps {
  children: ReactNode
}

const subscribeToScroll = (listener: () => void) => {
  window.addEventListener('scroll', listener, { passive: true })
  return () => window.removeEventListener('scroll', listener)
}

const getScrollSnapshot = () => window.scrollY > 24

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
  const authenticationScreen = ['/app/login', '/app/sesion-expirada', '/app/acceso-denegado'].some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
  )
  const publicShell = !internalPath || authenticationScreen

  return (
    <div className="flex min-h-dvh min-w-0 flex-col bg-lou-paper text-lou-ink">
      {publicShell && (
        <header
          className={`top-0 z-40 w-full text-white transition-[background-color,border-color,box-shadow] duration-200 ${
            landingScreen
              ? `fixed ${
                  landingHeaderScrolled
                    ? 'border-b border-white/10 bg-lou-ink/95 shadow-lg backdrop-blur-xl'
                    : 'border-b border-transparent bg-transparent'
                }`
              : 'sticky border-b border-white/10 bg-lou-ink/95 shadow-lg backdrop-blur-xl'
          }`}
          data-landing-header={
            landingScreen ? (landingHeaderScrolled ? 'solid' : 'transparent') : undefined
          }
        >
          <div className="mx-auto flex min-h-18 max-w-360 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <BrandLockup />
            <nav className="flex items-center gap-1 sm:gap-3" aria-label="Navegación pública">
              {landingScreen && (
                <>
                  <a
                    className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
                    href="#servicios"
                  >
                    Servicios
                  </a>
                  <a
                    className="hidden min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
                    href="#como-funciona"
                  >
                    Cómo funciona
                  </a>
                </>
              )}
              <Link
                className="hidden min-h-11 items-center rounded-xl px-4 text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:inline-flex"
                to="/mi-cita"
                viewTransition
              >
                Mi cita
              </Link>
              <Link
                className="inline-flex min-h-11 items-center rounded-xl bg-white px-4 text-sm font-bold text-lou-ink shadow-sm transition-transform duration-150 hover:-translate-y-0.5 active:scale-[0.98]"
                to="/reservar"
                viewTransition
              >
                Reservar
              </Link>
            </nav>
          </div>
        </header>
      )}
      <ConnectivityBanner connectivity={connectivity} />
      <ServiceWorkerUpdateBanner />
      <div className="min-w-0 flex-1">{children}</div>
      {publicShell && (
        <footer className="border-t border-lou-fog bg-white">
          <div className="mx-auto grid max-w-360 gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6 lg:px-10">
            <div>
              <BrandLockup linked={false} className="text-lou-ink" />
              <p className="mt-4 max-w-md text-sm leading-6 text-lou-graphite/70">
                Reserva tu cita sin crear una cuenta y gestiona los cambios desde tu enlace privado.
              </p>
              <SocialLinks />
            </div>
            <nav className="grid content-start gap-2 text-sm" aria-label="Enlaces del pie">
              <Link className="font-semibold hover:underline" to="/reservar" viewTransition>
                Reservar una cita
              </Link>
              <Link className="font-semibold hover:underline" to="/mi-cita" viewTransition>
                Gestionar mi cita
              </Link>
              <Link className="text-lou-graphite/65 hover:underline" to="/app/login" viewTransition>
                Acceso del equipo
              </Link>
            </nav>
          </div>
          <div className="border-t border-lou-fog px-4 py-4 text-center text-xs text-lou-graphite/60">
            Lou Barbershop · America/La_Paz · BOB
          </div>
        </footer>
      )}
    </div>
  )
}
