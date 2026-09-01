import type { ReactNode } from 'react'
import { ConnectivityBanner } from '../components/ConnectivityBanner'
import { useConnectivity } from '../hooks/useConnectivity'

interface AppShellProps {
  children: ReactNode
}

export const AppShell = ({ children }: AppShellProps) => {
  const connectivity = useConnectivity()

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Lou Barbershop">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span>
            <strong>Lou Barbershop</strong>
            <small>Una sola sucursal</small>
          </span>
        </div>
        <span className="phase-pill">Base técnica · Fase 1</span>
      </header>
      <ConnectivityBanner connectivity={connectivity} />
      {children}
      <footer className="footer">America/La_Paz · BOB · PWA segura</footer>
    </div>
  )
}
