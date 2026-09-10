import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
    <div className="app-shell">
      {publicShell && (
        <header className="topbar">
          <BrandLockup />
          <Link className="topbar-action" to="/reservar">
            Reservar cita
          </Link>
        </header>
      )}
      <ConnectivityBanner connectivity={connectivity} />
      <ServiceWorkerUpdateBanner />
      {children}
      {publicShell && <footer className="footer">Lou Barbershop · America/La_Paz · BOB</footer>}
    </div>
  )
}
