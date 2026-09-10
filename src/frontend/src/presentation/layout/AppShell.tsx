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
  const publicShell = ['/book', '/login', '/session-expired', '/access-denied'].some(
    (route) => location.pathname === route || location.pathname.startsWith(`${route}/`),
  )

  return (
    <div className="app-shell">
      {publicShell && (
        <header className="topbar">
          <BrandLockup />
          <Link className="topbar-action" to="/book">
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
