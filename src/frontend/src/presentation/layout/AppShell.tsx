import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'motion/react'
import { BrandLockup } from '../components/BrandLockup'
import { ConnectivityBanner } from '../components/ConnectivityBanner'
import { useConnectivity } from '../hooks/useConnectivity'
import { ServiceWorkerUpdateBanner } from '../components/ServiceWorkerUpdateBanner'

interface AppShellProps {
  children: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  const connectivity = useConnectivity()
  const location = useLocation()
  const internalPath = location.pathname === '/app' || location.pathname.startsWith('/app/')
  const authenticationScreen = ['/app/login', '/app/sesion-expirada', '/app/acceso-denegado'].some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
  )
  const publicShell = !internalPath || authenticationScreen

  return (
    <div className="grid min-h-screen min-w-0 grid-cols-1 grid-rows-[auto_auto_auto_1fr_auto] bg-lou-paper text-lou-ink">
      {publicShell && (
        <header className="sticky top-0 z-40 border-b border-white/10 bg-lou-ink/95 text-white shadow-lg backdrop-blur-xl">
          <div className="mx-auto flex min-h-18 max-w-360 items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <BrandLockup />
            <nav className="flex items-center gap-1 sm:gap-3" aria-label="Navegación pública">
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
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={location.pathname}
          className="min-w-0"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
        >
          {children}
        </m.div>
      </AnimatePresence>
      {publicShell && (
        <footer className="border-t border-lou-fog bg-white">
          <div className="mx-auto grid max-w-360 gap-8 px-4 py-10 sm:grid-cols-[1fr_auto] sm:px-6 lg:px-10">
            <div>
              <BrandLockup linked={false} className="text-lou-ink" />
              <p className="mt-4 max-w-md text-sm leading-6 text-lou-graphite/70">
                Reserva tu cita sin crear una cuenta y gestiona los cambios desde tu enlace privado.
              </p>
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
