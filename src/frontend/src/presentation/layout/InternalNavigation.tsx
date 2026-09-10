import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AppIcon } from '../components/AppIcon'
import { BrandLockup } from '../components/BrandLockup'

interface InternalNavigationProps {
  roles: string[]
  userName: string
  onLogout: () => Promise<void>
}

const navClassName = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'internal-nav-link active' : 'internal-nav-link'

export const InternalNavigation = ({ roles, userName, onLogout }: InternalNavigationProps) => {
  const [moreOpen, setMoreOpen] = useState(false)
  const isOwner = roles.includes('OWNER')
  const canManage = isOwner || roles.includes('ADMIN')
  const earnsCommission = isOwner || roles.includes('BARBER')

  const secondaryLinks = (
    <>
      {earnsCommission && (
        <NavLink className={navClassName} to="/app/comisiones">
          <AppIcon name="wallet" />
          Comisiones
        </NavLink>
      )}
      {isOwner && (
        <NavLink className={navClassName} to="/app/reportes">
          <AppIcon name="chart" />
          Reportes
        </NavLink>
      )}
      {canManage && (
        <NavLink className={navClassName} to="/app/inventario">
          <AppIcon name="box" />
          Inventario y gastos
        </NavLink>
      )}
      <NavLink className={navClassName} to="/app/disponibilidad">
        <AppIcon name="clock" />
        Disponibilidad
      </NavLink>
      {isOwner && (
        <NavLink className={navClassName} to="/app/configuracion">
          <AppIcon name="settings" />
          Configuración
        </NavLink>
      )}
    </>
  )

  return (
    <>
      <aside className="app-sidebar" aria-label="Navegación principal">
        <BrandLockup to="/app" />
        <nav>
          <NavLink className={navClassName} to="/app" end>
            <AppIcon name="home" />
            Inicio
          </NavLink>
          <NavLink className={navClassName} to="/app/agenda">
            <AppIcon name="calendar" />
            Agenda
          </NavLink>
          <NavLink className={navClassName} to="/app/atenciones">
            <AppIcon name="scissors" />
            Atender y cobrar
          </NavLink>
          {secondaryLinks}
        </nav>
        <div className="sidebar-session">
          <span>Sesión activa</span>
          <strong>{userName}</strong>
          <button type="button" onClick={() => void onLogout()}>
            <AppIcon name="logout" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <nav className="mobile-tabbar" aria-label="Navegación principal móvil">
        <NavLink className={navClassName} to="/app" end>
          <AppIcon name="home" />
          <span>Inicio</span>
        </NavLink>
        <NavLink className={navClassName} to="/app/agenda">
          <AppIcon name="calendar" />
          <span>Agenda</span>
        </NavLink>
        <NavLink className={navClassName} to="/app/atenciones">
          <AppIcon name="scissors" />
          <span>Atender</span>
        </NavLink>
        <button
          aria-expanded={moreOpen}
          aria-controls="mobile-more-menu"
          className={moreOpen ? 'internal-nav-link active' : 'internal-nav-link'}
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <AppIcon name="more" />
          <span>Más</span>
        </button>
      </nav>
      {moreOpen && (
        <div className="mobile-more-backdrop">
          <div id="mobile-more-menu" className="mobile-more-menu">
            <div className="mobile-more-heading">
              <span>
                <small>Sesión activa</small>
                <strong>{userName}</strong>
              </span>
              <button type="button" aria-label="Cerrar menú" onClick={() => setMoreOpen(false)}>
                ×
              </button>
            </div>
            <nav>{secondaryLinks}</nav>
            <button className="logout-button" type="button" onClick={() => void onLogout()}>
              <AppIcon name="logout" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  )
}
